import Database from 'better-sqlite3';
import { config } from '../config/env';
import { logInfo } from '../core/logger';

export const db = new Database(config.databaseFile);

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT,
      text TEXT NOT NULL,
      clean_text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      raw_payload TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reviews_week_start
      ON reviews (week_start);
  `);

  logInfo('Database schema initialized');
}

