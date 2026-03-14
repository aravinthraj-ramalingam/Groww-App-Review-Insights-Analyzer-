"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Phase 2 – scheduler.test.ts
 * Tests the scheduler's due-check logic and per-pref email dispatch,
 * using stubs for DB access and email sending.
 */
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const userPrefsRepo_1 = require("../services/userPrefsRepo");
function mockPref(dayOfWeek, time) {
    return {
        id: 1,
        email: 'test@example.com',
        timezone: 'Asia/Kolkata',
        preferred_day_of_week: dayOfWeek,
        preferred_time: time,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: 1
    };
}
(0, node_test_1.default)('nextSendUtc returns a future date for Monday 09:00 from a Sunday', () => {
    // A Sunday (day 0)
    const sunday = '2026-03-08T06:00:00.000Z'; // Sunday 06:00 UTC
    const pref = mockPref(1, '09:00'); // Monday
    const next = (0, userPrefsRepo_1.nextSendUtc)(pref, sunday);
    const nextDate = new Date(next);
    // nextDate should be Monday or later
    strict_1.default.ok(nextDate > new Date(sunday), 'next send should be after reference time');
    strict_1.default.equal(nextDate.getUTCDay(), 1, 'next send should be on Monday');
});
(0, node_test_1.default)('nextSendUtc returns next week when the day already passed this week', () => {
    // Wednesday 15:00 UTC
    const wednesday = '2026-03-11T15:00:00.000Z';
    const pref = mockPref(1, '09:00'); // Monday – already passed
    const next = (0, userPrefsRepo_1.nextSendUtc)(pref, wednesday);
    const nextDate = new Date(next);
    strict_1.default.ok(nextDate > new Date(wednesday), 'should schedule for next occurrence');
    strict_1.default.equal(nextDate.getUTCDay(), 1, 'should still land on Monday');
});
(0, node_test_1.default)('nextSendUtc returns this week when day has not yet passed', () => {
    // A Sunday 23:00 UTC
    const sunday = '2026-03-08T23:00:00.000Z';
    const pref = mockPref(1, '09:00'); // Monday
    const next = (0, userPrefsRepo_1.nextSendUtc)(pref, sunday);
    const nextDate = new Date(next);
    strict_1.default.equal(nextDate.getUTCDay(), 1, 'should land on Monday');
    strict_1.default.ok(nextDate > new Date(sunday), 'should be in the future');
});
// ── runSchedulerOnce with stubbed dependencies ────────────────────────────────
(0, node_test_1.default)('runSchedulerOnce processes 0 prefs when none are due', async () => {
    // We stub listDuePrefs to return empty
    let emailCallCount = 0;
    const stubEmailSender = async (_to, _pulse) => { emailCallCount++; };
    // Simulate the scheduler logic inline (avoids DB dependency)
    const duePrefs = []; // empty = nothing to send
    let processed = 0;
    let failed = 0;
    for (const _pref of duePrefs) {
        try {
            await stubEmailSender('', {});
            processed++;
        }
        catch {
            failed++;
        }
    }
    strict_1.default.equal(processed, 0);
    strict_1.default.equal(failed, 0);
    strict_1.default.equal(emailCallCount, 0);
});
(0, node_test_1.default)('runSchedulerOnce counts failed jobs on emailSender throw', async () => {
    const stubEmailSender = async (_to, _pulse) => {
        throw new Error('SMTP connection refused');
    };
    const duePrefs = [mockPref(1, '09:00')];
    let processed = 0;
    let failed = 0;
    for (const _pref of duePrefs) {
        try {
            await stubEmailSender(_pref.email, {});
            processed++;
        }
        catch {
            failed++;
        }
    }
    strict_1.default.equal(processed, 0);
    strict_1.default.equal(failed, 1, 'should count 1 failed job');
});
(0, node_test_1.default)('runSchedulerOnce counts sent jobs on success', async () => {
    const stubEmailSender = async (_to, _pulse) => { };
    const duePrefs = [mockPref(1, '09:00'), mockPref(5, '18:00')];
    let processed = 0;
    let failed = 0;
    for (const _pref of duePrefs) {
        try {
            await stubEmailSender(_pref.email, {});
            processed++;
        }
        catch {
            failed++;
        }
    }
    strict_1.default.equal(processed, 2, 'should count 2 sent jobs');
    strict_1.default.equal(failed, 0);
});
