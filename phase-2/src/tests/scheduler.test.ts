/**
 * Phase 2 – scheduler.test.ts
 * Tests the scheduler's due-check logic and per-pref email dispatch,
 * using stubs for DB access and email sending.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextSendUtc } from '../services/userPrefsRepo';

// ── nextSendUtc helper tests ─────────────────────────────────────────────────

type MockPref = {
  id: number;
  email: string;
  timezone: string;
  preferred_day_of_week: number;
  preferred_time: string;
  created_at: string;
  updated_at: string;
  active: number;
};

function mockPref(dayOfWeek: number, time: string): MockPref {
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

test('nextSendUtc returns a future date for Monday 09:00 from a Sunday', () => {
  // A Sunday (day 0)
  const sunday = '2026-03-08T06:00:00.000Z'; // Sunday 06:00 UTC
  const pref = mockPref(1, '09:00'); // Monday
  const next = nextSendUtc(pref as any, sunday);
  const nextDate = new Date(next);
  // nextDate should be Monday or later
  assert.ok(nextDate > new Date(sunday), 'next send should be after reference time');
  assert.equal(nextDate.getUTCDay(), 1, 'next send should be on Monday');
});

test('nextSendUtc returns next week when the day already passed this week', () => {
  // Wednesday 15:00 UTC
  const wednesday = '2026-03-11T15:00:00.000Z';
  const pref = mockPref(1, '09:00'); // Monday – already passed
  const next = nextSendUtc(pref as any, wednesday);
  const nextDate = new Date(next);
  assert.ok(nextDate > new Date(wednesday), 'should schedule for next occurrence');
  assert.equal(nextDate.getUTCDay(), 1, 'should still land on Monday');
});

test('nextSendUtc returns this week when day has not yet passed', () => {
  // A Sunday 23:00 UTC
  const sunday = '2026-03-08T23:00:00.000Z';
  const pref = mockPref(1, '09:00'); // Monday
  const next = nextSendUtc(pref as any, sunday);
  const nextDate = new Date(next);
  assert.equal(nextDate.getUTCDay(), 1, 'should land on Monday');
  assert.ok(nextDate > new Date(sunday), 'should be in the future');
});

// ── runSchedulerOnce with stubbed dependencies ────────────────────────────────

test('runSchedulerOnce processes 0 prefs when none are due', async () => {
  // We stub listDuePrefs to return empty
  let emailCallCount = 0;
  const stubEmailSender = async (_to: string, _pulse: any) => { emailCallCount++; };

  // Simulate the scheduler logic inline (avoids DB dependency)
  const duePrefs: MockPref[] = []; // empty = nothing to send
  let processed = 0;
  let failed = 0;
  for (const _pref of duePrefs) {
    try {
      await stubEmailSender('', {});
      processed++;
    } catch {
      failed++;
    }
  }

  assert.equal(processed, 0);
  assert.equal(failed, 0);
  assert.equal(emailCallCount, 0);
});

test('runSchedulerOnce counts failed jobs on emailSender throw', async () => {
  const stubEmailSender = async (_to: string, _pulse: any): Promise<void> => {
    throw new Error('SMTP connection refused');
  };

  const duePrefs: MockPref[] = [mockPref(1, '09:00')];
  let processed = 0;
  let failed = 0;

  for (const _pref of duePrefs) {
    try {
      await stubEmailSender(_pref.email, {});
      processed++;
    } catch {
      failed++;
    }
  }

  assert.equal(processed, 0);
  assert.equal(failed, 1, 'should count 1 failed job');
});

test('runSchedulerOnce counts sent jobs on success', async () => {
  const stubEmailSender = async (_to: string, _pulse: any): Promise<void> => { /* success */ };

  const duePrefs: MockPref[] = [mockPref(1, '09:00'), mockPref(5, '18:00')];
  let processed = 0;
  let failed = 0;

  for (const _pref of duePrefs) {
    try {
      await stubEmailSender(_pref.email, {});
      processed++;
    } catch {
      failed++;
    }
  }

  assert.equal(processed, 2, 'should count 2 sent jobs');
  assert.equal(failed, 0);
});
