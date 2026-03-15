import { dbAdapter } from '../db/dbAdapter';
import { logInfo, logError } from '../core/logger';
import { generatePulse } from '../services/pulseService';
import { sendPulseEmail } from '../services/emailService';
import { listDuePrefs, UserPrefsRow } from '../services/userPrefsRepo';

/**
 * Get the Monday of the most recently completed full week (UTC).
 */
function lastFullWeekStart(fromUtcIso = new Date().toISOString()): string {
  const now = new Date(fromUtcIso);
  const dayOfWeek = now.getUTCDay(); // 0=Sun
  // Roll back to last Monday
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysBack - 7);
  return monday.toISOString().slice(0, 10);
}

async function scheduleJobRow(prefId: number, weekStart: string, scheduledAt: string): Promise<number> {
  const result = await dbAdapter.run(
    `INSERT INTO scheduled_jobs (user_preference_id, week_start, scheduled_at_utc, status)
     VALUES (?, ?, ?, 'pending')`,
    [prefId, weekStart, scheduledAt]
  );
  return result.lastID!;
}

async function markJobSent(jobId: number): Promise<void> {
  await dbAdapter.run(
    `UPDATE scheduled_jobs SET status = 'sent', sent_at_utc = ? WHERE id = ?`,
    [new Date().toISOString(), jobId]
  );
}

async function markJobFailed(jobId: number, error: string): Promise<void> {
  await dbAdapter.run(
    `UPDATE scheduled_jobs SET status = 'failed', last_error = ? WHERE id = ?`,
    [error, jobId]
  );
}

/**
 * Public injectable email sender (can be replaced in tests).
 */
export type EmailSender = (to: string, pulse: Awaited<ReturnType<typeof generatePulse>>) => Promise<void>;

/**
 * Run a single scheduler tick:
 * 1. Find prefs that are due right now.
 * 2. For each pref: generate/fetch pulse → send email → record result.
 */
export async function runSchedulerOnce(
  nowUtcIso = new Date().toISOString(),
  emailSender: EmailSender = sendPulseEmail
): Promise<{ processed: number; failed: number }> {
  const duePrefs = await listDuePrefs(nowUtcIso);
  logInfo('Scheduler tick', { duePrefs: duePrefs.length, nowUtcIso });

  let processed = 0;
  let failed = 0;

  for (const pref of duePrefs) {
    const weekStart = lastFullWeekStart(nowUtcIso);
    const jobId = await scheduleJobRow(pref.id, weekStart, nowUtcIso);

    try {
      logInfo('Processing scheduled job', { jobId, prefId: pref.id, weekStart });

      const pulse = await generatePulse(weekStart);
      await emailSender(pref.email, pulse);

      await markJobSent(jobId);
      processed++;
      logInfo('Scheduled pulse sent', { jobId, email: pref.email, weekStart });
    } catch (err: any) {
      const errMsg = err?.message ?? String(err);
      await markJobFailed(jobId, errMsg);
      failed++;
      logError('Scheduled pulse failed', { jobId, error: errMsg });
    }
  }

  return { processed, failed };
}

/**
 * Start a long-running scheduler loop.
 * Call once at server startup.
 */
export function startScheduler(intervalMs = 5 * 60 * 1000): NodeJS.Timeout {
  logInfo('Scheduler started', { intervalMs });
  // Run once immediately, then on interval
  runSchedulerOnce().catch((err) => logError('Initial scheduler tick failed', err));
  return setInterval(() => {
    runSchedulerOnce().catch((err) => logError('Scheduler tick failed', err));
  }, intervalMs);
}
