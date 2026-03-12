import { writeFileSync } from 'fs';
import path from 'path';
import { db, initSchema } from '../db';
import { Review } from '../domain/review.model';
import { scrapeFilteredReviews } from '../scraper/playstoreScraper';
import { logInfo } from '../core/logger';

initSchema();

export async function scrapeAndStoreReviews(maxReviews?: number): Promise<{ inserted: number }> {
  const reviews = await scrapeFilteredReviews({ maxReviews });

  logInfo('Scrape finished, about to persist reviews', { toInsert: reviews.length });

  if (reviews.length === 0) {
    return { inserted: 0 };
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO reviews (
      id, platform, rating, title, text, clean_text, created_at, week_start, week_end, raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  const transaction = db.transaction((items: Review[]) => {
    for (const r of items) {
      insert.run(
        r.id,
        r.platform,
        r.rating,
        r.title,
        r.text,
        r.cleanText,
        r.createdAt.toISOString(),
        r.weekStart,
        r.weekEnd,
        JSON.stringify(r.rawPayload ?? null)
      );
    }
  });

  transaction(reviews);

  // Write a debug JSON file with all scraped reviews for easy inspection.
  try {
    const debugPath = path.join(process.cwd(), 'scraped-reviews.json');
    writeFileSync(
      debugPath,
      JSON.stringify(
        reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          text: r.text,
          cleanText: r.cleanText,
          createdAt: r.createdAt.toISOString(),
          weekStart: r.weekStart,
          weekEnd: r.weekEnd
        })),
        null,
        2
      ),
      'utf8'
    );
    logInfo('Wrote scraped reviews JSON file', { path: debugPath });
  } catch {
    // Ignore JSON file write errors in phase 1.
  }

  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM reviews').get() as { cnt: number };

  logInfo('Scrape and store complete', { inserted: reviews.length, totalInDb: countRow.cnt });

  return { inserted: reviews.length };
}

export function listReviews(limit = 100): Review[] {
  const stmt = db.prepare(`
    SELECT id, platform, rating, title, text, clean_text, created_at, week_start, week_end, raw_payload
    FROM reviews
    ORDER BY created_at DESC
    LIMIT ?;
  `);

  const rows = stmt.all(limit) as any[];

  return rows.map((row) => ({
    id: row.id,
    platform: row.platform,
    rating: row.rating,
    title: row.title,
    text: row.text,
    cleanText: row.clean_text,
    createdAt: new Date(row.created_at),
    weekStart: row.week_start,
    weekEnd: row.week_end,
    rawPayload: row.raw_payload ? JSON.parse(row.raw_payload) : null
  }));
}

