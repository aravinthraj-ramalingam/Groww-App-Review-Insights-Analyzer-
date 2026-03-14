"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Phase 2 – userPrefs.test.ts
 * Tests user preferences CRUD operations using an in-memory SQLite DB.
 */
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
// ── In-memory schema helper ───────────────────────────────────────────────────
function buildPrefsDb() {
    const db = new better_sqlite3_1.default(':memory:');
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
function upsert(db, input) {
    const now = new Date().toISOString();
    db.prepare(`UPDATE user_preferences SET active = 0, updated_at = ? WHERE active = 1`).run(now);
    const info = db.prepare(`INSERT INTO user_preferences (email,timezone,preferred_day_of_week,preferred_time,created_at,updated_at,active)
     VALUES (?,?,?,?,?,?,1)`).run(input.email, input.timezone, input.preferred_day_of_week, input.preferred_time, now, now);
    return db.prepare(`SELECT * FROM user_preferences WHERE id = ?`).get(info.lastInsertRowid);
}
function getActive(db) {
    return db.prepare(`SELECT * FROM user_preferences WHERE active = 1 ORDER BY updated_at DESC LIMIT 1`).get() ?? null;
}
// ── Tests ─────────────────────────────────────────────────────────────────────
(0, node_test_1.default)('upsertUserPrefs creates a new preference row', () => {
    const db = buildPrefsDb();
    const saved = upsert(db, {
        email: 'test@example.com',
        timezone: 'Asia/Kolkata',
        preferred_day_of_week: 1, // Monday
        preferred_time: '09:00'
    });
    strict_1.default.equal(saved.email, 'test@example.com');
    strict_1.default.equal(saved.timezone, 'Asia/Kolkata');
    strict_1.default.equal(saved.preferred_day_of_week, 1);
    strict_1.default.equal(saved.preferred_time, '09:00');
    strict_1.default.equal(saved.active, 1);
});
(0, node_test_1.default)('upsertUserPrefs deactivates the old row and inserts a new one', () => {
    const db = buildPrefsDb();
    upsert(db, { email: 'old@example.com', timezone: 'UTC', preferred_day_of_week: 0, preferred_time: '08:00' });
    upsert(db, { email: 'new@example.com', timezone: 'Asia/Kolkata', preferred_day_of_week: 1, preferred_time: '09:00' });
    const allRows = db.prepare(`SELECT * FROM user_preferences`).all();
    strict_1.default.equal(allRows.length, 2);
    const activeRows = allRows.filter((r) => r.active === 1);
    strict_1.default.equal(activeRows.length, 1, 'Only one row should be active');
    strict_1.default.equal(activeRows[0].email, 'new@example.com');
});
(0, node_test_1.default)('getUserPrefs returns null when no prefs exist', () => {
    const db = buildPrefsDb();
    const result = getActive(db);
    strict_1.default.equal(result, null);
});
(0, node_test_1.default)('getUserPrefs returns active preferences', () => {
    const db = buildPrefsDb();
    upsert(db, { email: 'a@b.com', timezone: 'UTC', preferred_day_of_week: 5, preferred_time: '18:00' });
    const result = getActive(db);
    strict_1.default.ok(result !== null);
    strict_1.default.equal(result.email, 'a@b.com');
});
(0, node_test_1.default)('preferred_time round-trips correctly', () => {
    const db = buildPrefsDb();
    const saved = upsert(db, { email: 'x@y.com', timezone: 'America/New_York', preferred_day_of_week: 3, preferred_time: '14:30' });
    strict_1.default.equal(saved.preferred_time, '14:30');
});
