"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSchedulerOnce = runSchedulerOnce;
exports.startScheduler = startScheduler;
const db_1 = require("../db");
const logger_1 = require("../core/logger");
const pulseService_1 = require("../services/pulseService");
const emailService_1 = require("../services/emailService");
const userPrefsRepo_1 = require("../services/userPrefsRepo");
/**
 * Get the Monday of the most recently completed full week (UTC).
 */
function lastFullWeekStart(fromUtcIso = new Date().toISOString()) {
    const now = new Date(fromUtcIso);
    const dayOfWeek = now.getUTCDay(); // 0=Sun
    // Roll back to last Monday
    const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - daysBack - 7);
    return monday.toISOString().slice(0, 10);
}
function scheduleJobRow(prefId, weekStart, scheduledAt) {
    const info = db_1.db
        .prepare(`INSERT INTO scheduled_jobs (user_preference_id, week_start, scheduled_at_utc, status)
       VALUES (?, ?, ?, 'pending')`)
        .run(prefId, weekStart, scheduledAt);
    return Number(info.lastInsertRowid);
}
function markJobSent(jobId) {
    db_1.db.prepare(`UPDATE scheduled_jobs SET status = 'sent', sent_at_utc = ? WHERE id = ?`).run(new Date().toISOString(), jobId);
}
function markJobFailed(jobId, error) {
    db_1.db.prepare(`UPDATE scheduled_jobs SET status = 'failed', last_error = ? WHERE id = ?`).run(error, jobId);
}
/**
 * Run a single scheduler tick:
 * 1. Find prefs that are due right now.
 * 2. For each pref: generate/fetch pulse → send email → record result.
 */
async function runSchedulerOnce(nowUtcIso = new Date().toISOString(), emailSender = emailService_1.sendPulseEmail) {
    const duePrefs = (0, userPrefsRepo_1.listDuePrefs)(nowUtcIso);
    (0, logger_1.logInfo)('Scheduler tick', { duePrefs: duePrefs.length, nowUtcIso });
    let processed = 0;
    let failed = 0;
    for (const pref of duePrefs) {
        const weekStart = lastFullWeekStart(nowUtcIso);
        const jobId = scheduleJobRow(pref.id, weekStart, nowUtcIso);
        try {
            (0, logger_1.logInfo)('Processing scheduled job', { jobId, prefId: pref.id, weekStart });
            const pulse = await (0, pulseService_1.generatePulse)(weekStart);
            await emailSender(pref.email, pulse);
            markJobSent(jobId);
            processed++;
            (0, logger_1.logInfo)('Scheduled pulse sent', { jobId, email: pref.email, weekStart });
        }
        catch (err) {
            const errMsg = err?.message ?? String(err);
            markJobFailed(jobId, errMsg);
            failed++;
            (0, logger_1.logError)('Scheduled pulse failed', { jobId, error: errMsg });
        }
    }
    return { processed, failed };
}
/**
 * Start a long-running scheduler loop.
 * Call once at server startup.
 */
function startScheduler(intervalMs = 5 * 60 * 1000) {
    (0, logger_1.logInfo)('Scheduler started', { intervalMs });
    // Run once immediately, then on interval
    runSchedulerOnce().catch((err) => (0, logger_1.logError)('Initial scheduler tick failed', err));
    return setInterval(() => {
        runSchedulerOnce().catch((err) => (0, logger_1.logError)('Scheduler tick failed', err));
    }, intervalMs);
}
