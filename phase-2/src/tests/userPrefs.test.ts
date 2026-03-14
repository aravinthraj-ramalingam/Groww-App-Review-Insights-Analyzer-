/**
 * Phase 2 – userPrefs.test.ts
 * Tests user preferences CRUD operations using an in-memory SQLite DB.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';

// ── In-memory schema helper ───────────────────────────────────────────────────
function buildPrefsDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      timezone TEXT NOT NULL,
      preferred_day_of_week INTEGER NOT NULL,
      preferred_time TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);
  return db;
}

// ── Inline repo functions (mirror userPrefsRepo logic against local db) ───────
type Prefs = {
  id: number; email: string; timezone: string;
  preferred_day_of_week: number; preferred_time: string;
  created_at: string; updated_at: string; active: number;
};

function upsert(db: ReturnType<typeof buildPrefsDb>, input: Omit<Prefs, 'id'|'created_at'|'updated_at'|'active'>): Prefs {
  const now = new Date().toISOString();
  db.prepare(`UPDATE user_preferences SET active = 0, updated_at = ? WHERE active = 1`).run(now);
  const info = db.prepare(
    `INSERT INTO user_preferences (email,timezone,preferred_day_of_week,preferred_time,created_at,updated_at,active)
     VALUES (?,?,?,?,?,?,1)`
  ).run(input.email, input.timezone, input.preferred_day_of_week, input.preferred_time, now, now);
  return db.prepare(`SELECT * FROM user_preferences WHERE id = ?`).get(info.lastInsertRowid) as Prefs;
}

function getActive(db: ReturnType<typeof buildPrefsDb>): Prefs | null {
  return (db.prepare(`SELECT * FROM user_preferences WHERE active = 1 ORDER BY updated_at DESC LIMIT 1`).get() as Prefs) ?? null;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('upsertUserPrefs creates a new preference row', () => {
  const db = buildPrefsDb();
  const saved = upsert(db, {
    email: 'test@example.com',
    timezone: 'Asia/Kolkata',
    preferred_day_of_week: 1, // Monday
    preferred_time: '09:00'
  });

  assert.equal(saved.email, 'test@example.com');
  assert.equal(saved.timezone, 'Asia/Kolkata');
  assert.equal(saved.preferred_day_of_week, 1);
  assert.equal(saved.preferred_time, '09:00');
  assert.equal(saved.active, 1);
});

test('upsertUserPrefs deactivates the old row and inserts a new one', () => {
  const db = buildPrefsDb();

  upsert(db, { email: 'old@example.com', timezone: 'UTC', preferred_day_of_week: 0, preferred_time: '08:00' });
  upsert(db, { email: 'new@example.com', timezone: 'Asia/Kolkata', preferred_day_of_week: 1, preferred_time: '09:00' });

  const allRows = db.prepare(`SELECT * FROM user_preferences`).all() as Prefs[];
  assert.equal(allRows.length, 2);

  const activeRows = allRows.filter((r) => r.active === 1);
  assert.equal(activeRows.length, 1, 'Only one row should be active');
  assert.equal(activeRows[0].email, 'new@example.com');
});

test('getUserPrefs returns null when no prefs exist', () => {
  const db = buildPrefsDb();
  const result = getActive(db);
  assert.equal(result, null);
});

test('getUserPrefs returns active preferences', () => {
  const db = buildPrefsDb();
  upsert(db, { email: 'a@b.com', timezone: 'UTC', preferred_day_of_week: 5, preferred_time: '18:00' });
  const result = getActive(db);
  assert.ok(result !== null);
  assert.equal(result!.email, 'a@b.com');
});

test('preferred_time round-trips correctly', () => {
  const db = buildPrefsDb();
  const saved = upsert(db, { email: 'x@y.com', timezone: 'America/New_York', preferred_day_of_week: 3, preferred_time: '14:30' });
  assert.equal(saved.preferred_time, '14:30');
});
