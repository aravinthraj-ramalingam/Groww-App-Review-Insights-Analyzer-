import Database from 'better-sqlite3';
import { config } from '../config/env';
import { logInfo } from '../core/logger';

export const db = new Database(config.databaseFile);

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      valid_from TEXT,
      valid_to TEXT
    );
  `);

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_themes_name_window
    ON themes (name, valid_from, valid_to);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS review_themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id TEXT NOT NULL,
      theme_id INTEGER NOT NULL,
      confidence REAL,
      UNIQUE(review_id, theme_id),
      FOREIGN KEY(theme_id) REFERENCES themes(id)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_review_themes_review_id
    ON review_themes (review_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_pulses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      top_themes TEXT NOT NULL,
      user_quotes TEXT NOT NULL,
      action_ideas TEXT NOT NULL,
      note_body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );
  `);

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_pulses_week_version
    ON weekly_pulses (week_start, version);
  `);

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

  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_preference_id INTEGER NOT NULL,
      week_start TEXT NOT NULL,
      scheduled_at_utc TEXT NOT NULL,
      sent_at_utc TEXT,
      status TEXT NOT NULL,
      last_error TEXT,
      FOREIGN KEY(user_preference_id) REFERENCES user_preferences(id)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_time
    ON scheduled_jobs (status, scheduled_at_utc);
  `);

  logInfo('Phase 2 schema initialized', { databaseFile: config.databaseFile });
}

