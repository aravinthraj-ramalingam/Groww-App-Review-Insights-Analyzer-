import { db } from '../db';
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

function scheduleJobRow(prefId: number, weekStart: string, scheduledAt: string): number {
  const info = db
    .prepare(
      `INSERT INTO scheduled_jobs (user_preference_id, week_start, scheduled_at_utc, status)
       VALUES (?, ?, ?, 'pending')`
    )
    .run(prefId, weekStart, scheduledAt);
  return Number(info.lastInsertRowid);
}

function markJobSent(jobId: number): void {
  db.prepare(
    `UPDATE scheduled_jobs SET status = 'sent', sent_at_utc = ? WHERE id = ?`
  ).run(new Date().toISOString(), jobId);
}

function markJobFailed(jobId: number, error: string): void {
  db.prepare(
    `UPDATE scheduled_jobs SET status = 'failed', last_error = ? WHERE id = ?`
  ).run(error, jobId);
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
  const duePrefs = listDuePrefs(nowUtcIso);
  logInfo('Scheduler tick', { duePrefs: duePrefs.length, nowUtcIso });

  let processed = 0;
  let failed = 0;

  for (const pref of duePrefs) {
    const weekStart = lastFullWeekStart(nowUtcIso);
    const jobId = scheduleJobRow(pref.id, weekStart, nowUtcIso);

    try {
      logInfo('Processing scheduled job', { jobId, prefId: pref.id, weekStart });

      const pulse = await generatePulse(weekStart);
      await emailSender(pref.email, pulse);

      markJobSent(jobId);
      processed++;
      logInfo('Scheduled pulse sent', { jobId, email: pref.email, weekStart });
    } catch (err: any) {
      const errMsg = err?.message ?? String(err);
      markJobFailed(jobId, errMsg);
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
