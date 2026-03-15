import { Pool, PoolClient } from 'pg';
import { logInfo, logError } from '../core/logger';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
    }
    
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false // Required for Render's PostgreSQL
      }
    });
    
    pool.on('error', (err) => {
      logError('PostgreSQL pool error', err);
    });
  }
  return pool;
}

export async function initPostgresSchema(): Promise<void> {
  const client = await getPool().connect();
  try {
    // Reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        rating INTEGER NOT NULL,
        title TEXT,
        text TEXT NOT NULL,
        clean_text TEXT,
        author TEXT,
        created_at TIMESTAMP NOT NULL,
        week_start DATE NOT NULL,
        week_end DATE NOT NULL,
        has_unicode INTEGER DEFAULT 0
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_week_start ON reviews (week_start)
    `);

    // Themes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS themes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        valid_from DATE,
        valid_to DATE
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_themes_name_window 
      ON themes (name, valid_from, valid_to)
    `);

    // Review themes junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS review_themes (
        id SERIAL PRIMARY KEY,
        review_id TEXT NOT NULL REFERENCES reviews(id),
        theme_id INTEGER NOT NULL REFERENCES themes(id),
        confidence REAL,
        UNIQUE(review_id, theme_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_review_themes_review_id ON review_themes (review_id)
    `);

    // Weekly pulses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS weekly_pulses (
        id SERIAL PRIMARY KEY,
        week_start DATE NOT NULL,
        week_end DATE NOT NULL,
        top_themes TEXT NOT NULL,
        user_quotes TEXT NOT NULL,
        action_ideas TEXT NOT NULL,
        note_body TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        version INTEGER NOT NULL DEFAULT 1,
        UNIQUE(week_start, version)
      )
    `);

    // Fix sequence if needed (in case of manual data insertion)
    await client.query(`
      SELECT setval('weekly_pulses_id_seq', COALESCE((SELECT MAX(id) FROM weekly_pulses), 0) + 1, false)
    `).catch(() => {
      // Ignore error if sequence doesn't exist yet
    });

    // User preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        timezone TEXT NOT NULL,
        preferred_day_of_week INTEGER NOT NULL,
        preferred_time TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        active INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Scheduled jobs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS scheduled_jobs (
        id SERIAL PRIMARY KEY,
        user_preference_id INTEGER NOT NULL REFERENCES user_preferences(id),
        week_start DATE NOT NULL,
        scheduled_at_utc TIMESTAMP NOT NULL,
        sent_at_utc TIMESTAMP,
        status TEXT NOT NULL,
        last_error TEXT
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_time 
      ON scheduled_jobs (status, scheduled_at_utc)
    `);

    logInfo('PostgreSQL schema initialized');
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
