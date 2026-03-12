import { db } from '../db';
import { ReviewRow } from '../domain/review';

export function listRecentReviews(weeksBack: number, limit: number): ReviewRow[] {
  const stmt = db.prepare(`
    SELECT id, rating, title, text, clean_text, created_at, week_start, week_end
    FROM reviews
    WHERE date(created_at) >= date('now', ?)
    ORDER BY created_at DESC
    LIMIT ?;
  `);
  const since = `-${Math.max(1, weeksBack * 7)} days`;
  return stmt.all(since, limit) as ReviewRow[];
}

export function listReviewsForWeek(weekStart: string): ReviewRow[] {
  const stmt = db.prepare(`
    SELECT id, rating, title, text, clean_text, created_at, week_start, week_end
    FROM reviews
    WHERE week_start = ?
    ORDER BY created_at DESC;
  `);
  return stmt.all(weekStart) as ReviewRow[];
}

