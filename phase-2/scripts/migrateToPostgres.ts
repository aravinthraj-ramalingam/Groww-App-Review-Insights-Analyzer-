import Database from 'better-sqlite3';
import { getPool, initPostgresSchema } from '../src/db/postgres';
import { logInfo, logError } from '../src/core/logger';

async function migrate() {
  try {
    logInfo('Starting migration from SQLite to PostgreSQL...');
    
    // Initialize PostgreSQL schema
    await initPostgresSchema();
    const pool = getPool();
    
    // Connect to SQLite
    const sqliteDb = new Database('../phase-1/phase1.db');
    
    // Migrate reviews
    logInfo('Migrating reviews...');
    const reviews = sqliteDb.prepare('SELECT * FROM reviews').all();
    for (const review of reviews) {
      await pool.query(
        `INSERT INTO reviews (id, platform, rating, title, text, clean_text, author, created_at, week_start, week_end, has_unicode)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [review.id, review.platform, review.rating, review.title, review.text, 
         review.clean_text, review.author, review.created_at, review.week_start, 
         review.week_end, review.has_unicode || 0]
      );
    }
    logInfo(`Migrated ${reviews.length} reviews`);
    
    // Migrate themes
    logInfo('Migrating themes...');
    const themes = sqliteDb.prepare('SELECT * FROM themes').all();
    for (const theme of themes) {
      await pool.query(
        `INSERT INTO themes (id, name, description, created_at, valid_from, valid_to)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [theme.id, theme.name, theme.description, theme.created_at, 
         theme.valid_from, theme.valid_to]
      );
    }
    logInfo(`Migrated ${themes.length} themes`);
    
    // Migrate review_themes
    logInfo('Migrating review_themes...');
    const reviewThemes = sqliteDb.prepare('SELECT * FROM review_themes').all();
    for (const rt of reviewThemes) {
      await pool.query(
        `INSERT INTO review_themes (id, review_id, theme_id, confidence)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [rt.id, rt.review_id, rt.theme_id, rt.confidence]
      );
    }
    logInfo(`Migrated ${reviewThemes.length} review_themes`);
    
    // Migrate weekly_pulses
    logInfo('Migrating weekly_pulses...');
    const pulses = sqliteDb.prepare('SELECT * FROM weekly_pulses').all();
    for (const pulse of pulses) {
      await pool.query(
        `INSERT INTO weekly_pulses (id, week_start, week_end, top_themes, user_quotes, action_ideas, note_body, created_at, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [pulse.id, pulse.week_start, pulse.week_end, pulse.top_themes, 
         pulse.user_quotes, pulse.action_ideas, pulse.note_body, 
         pulse.created_at, pulse.version]
      );
    }
    logInfo(`Migrated ${pulses.length} weekly_pulses`);
    
    // Migrate user_preferences
    logInfo('Migrating user_preferences...');
    const prefs = sqliteDb.prepare('SELECT * FROM user_preferences').all();
    for (const pref of prefs) {
      await pool.query(
        `INSERT INTO user_preferences (id, email, timezone, preferred_day_of_week, preferred_time, created_at, updated_at, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [pref.id, pref.email, pref.timezone, pref.preferred_day_of_week, 
         pref.preferred_time, pref.created_at, pref.updated_at, pref.active]
      );
    }
    logInfo(`Migrated ${prefs.length} user_preferences`);
    
    // Migrate scheduled_jobs
    logInfo('Migrating scheduled_jobs...');
    const jobs = sqliteDb.prepare('SELECT * FROM scheduled_jobs').all();
    for (const job of jobs) {
      await pool.query(
        `INSERT INTO scheduled_jobs (id, user_preference_id, week_start, scheduled_at_utc, sent_at_utc, status, last_error)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [job.id, job.user_preference_id, job.week_start, job.scheduled_at_utc, 
         job.sent_at_utc, job.status, job.last_error]
      );
    }
    logInfo(`Migrated ${jobs.length} scheduled_jobs`);
    
    sqliteDb.close();
    logInfo('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    logError('Migration failed', err);
    process.exit(1);
  }
}

migrate();
