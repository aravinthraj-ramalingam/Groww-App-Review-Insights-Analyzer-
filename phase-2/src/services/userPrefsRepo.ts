import { db } from '../db';

export interface UserPrefsInput {
  email: string;
  timezone: string;               // e.g. "Asia/Kolkata"
  preferred_day_of_week: number;  // 0=Sun .. 6=Sat
  preferred_time: string;         // "HH:MM" 24h
}

export interface UserPrefsRow extends UserPrefsInput {
  id: number;
  created_at: string;
  updated_at: string;
  active: number; // 1 | 0
}

/**
 * Create or update user preferences.
 * Only one active row is maintained; existing active rows are deactivated first.
 */
export function upsertUserPrefs(prefs: UserPrefsInput): UserPrefsRow {
  const now = new Date().toISOString();

  // Deactivate all existing active rows
  db.prepare(`UPDATE user_preferences SET active = 0, updated_at = ? WHERE active = 1`).run(now);

  // Insert new active row
  const insert = db.prepare(`
    INSERT INTO user_preferences (email, timezone, preferred_day_of_week, preferred_time, created_at, updated_at, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  const info = insert.run(
    prefs.email,
    prefs.timezone,
    prefs.preferred_day_of_week,
    prefs.preferred_time,
    now,
    now
  );

  return getUserPrefsById(Number(info.lastInsertRowid))!;
}

export function getUserPrefsById(id: number): UserPrefsRow | null {
  return (db.prepare(`SELECT * FROM user_preferences WHERE id = ?`).get(id) as UserPrefsRow) ?? null;
}

/** Returns the single active user preference row, or null if none configured. */
export function getUserPrefs(): UserPrefsRow | null {
  return (
    (db
      .prepare(`SELECT * FROM user_preferences WHERE active = 1 ORDER BY updated_at DESC LIMIT 1`)
      .get() as UserPrefsRow) ?? null
  );
}

/**
 * Compute the next UTC send time for the given preferences from a reference UTC time.
 * Returns an ISO string.
 */
export function nextSendUtc(prefs: UserPrefsRow, fromUtcIso = new Date().toISOString()): string {
  // Parse preferred_time as UTC-equivalent for simplicity (timezone offsets handled externally)
  const [hh, mm] = prefs.preferred_time.split(':').map(Number);
  const base = new Date(fromUtcIso);

  // Find the next occurrence of preferred_day_of_week at preferred_time
  const candidate = new Date(base);
  // Reset to preferred time today (in UTC, approximation – full timezone support is phase‑3 scope)
  candidate.setUTCHours(hh, mm, 0, 0);

  // Advance to correct day of week
  const dayDiff = (prefs.preferred_day_of_week - candidate.getUTCDay() + 7) % 7;
  candidate.setUTCDate(candidate.getUTCDate() + (dayDiff === 0 && candidate <= base ? 7 : dayDiff));

  return candidate.toISOString();
}

/**
 * Return user prefs rows that are due to receive a pulse at or before the given UTC time.
 * Checks the latest scheduled_job per user_preference.
 */
export function listDuePrefs(nowUtcIso = new Date().toISOString()): UserPrefsRow[] {
  // A preference is "due" if it has no sent scheduled_job for the current ISO week,
  // and nextSendUtc(prefs) <= nowUtcIso
  const rows = db
    .prepare(`SELECT * FROM user_preferences WHERE active = 1`)
    .all() as UserPrefsRow[];

  return rows.filter((p) => {
    const next = nextSendUtc(p, nowUtcIso);
    return next <= nowUtcIso;
  });
}
