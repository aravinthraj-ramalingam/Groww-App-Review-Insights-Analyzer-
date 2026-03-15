import { dbAdapter } from '../db/dbAdapter';
import { ReviewRow } from '../domain/review';

export async function listRecentReviews(weeksBack: number, limit: number): Promise<ReviewRow[]> {
  const since = `-${Math.max(1, weeksBack * 7)} days`;
  const result = await dbAdapter.query(`
    SELECT id, rating, title, text, clean_text, created_at, week_start, week_end
    FROM reviews
    WHERE date(created_at) >= date('now', ?)
    ORDER BY created_at DESC
    LIMIT ?
  `, [since, limit]);
  return result.rows as ReviewRow[];
}

export async function listReviewsForWeek(weekStart: string): Promise<ReviewRow[]> {
  const result = await dbAdapter.query(`
    SELECT id, rating, title, text, clean_text, created_at, week_start, week_end
    FROM reviews
    WHERE week_start = ?
    ORDER BY created_at DESC
  `, [weekStart]);
  return result.rows as ReviewRow[];
}

