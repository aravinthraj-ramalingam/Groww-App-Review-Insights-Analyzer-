import { z } from 'zod';
import { db } from '../db';
import { groqJson } from './groqClient';
import { ReviewRow } from '../domain/review';
import { listLatestThemes } from './themeService';
import { listReviewsForWeek } from './reviewsRepo';

// ----- Zod schemas -----
const AssignmentSchema = z.object({
  review_id: z.string(),
  theme_name: z.string(),
  confidence: z.number().min(0).max(1).optional()
});

const AssignResponseSchema = z.object({
  assignments: z.array(AssignmentSchema)
});

export type Assignment = z.infer<typeof AssignmentSchema>;

const BATCH_SIZE = 10;

/**
 * Call Groq to assign each review to one of the provided theme names (or "Other").
 * Processes reviews in batches of BATCH_SIZE to control token usage.
 */
export async function assignReviewsToThemes(
  reviews: ReviewRow[],
  themes: { id: number; name: string; description: string }[]
): Promise<Assignment[]> {
  if (reviews.length === 0 || themes.length === 0) return [];

  const themeNames = themes.map((t) => t.name);
  const themeListText = themes
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n');

  const system =
    'You are a product analyst assigning app review feedback to predefined themes. ' +
    'Do NOT include any personally identifying information in your responses.';

  const results: Assignment[] = [];

  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    const batch = reviews.slice(i, i + BATCH_SIZE);

    const reviewsText = batch
      .map((r, idx) => `[${idx}] id="${r.id}" text="${(r.clean_text || r.text).slice(0, 300)}"`)
      .join('\n');

    const user =
      `You are given a list of Groww Android app reviews and a list of allowed themes.\n` +
      `Assign each review to exactly ONE theme from the list below, or use "Other" if none fits.\n\n` +
      `Themes:\n${themeListText}\n\n` +
      `Reviews:\n${reviewsText}\n\n` +
      `For each review return its id, the theme_name (must be one of: ${themeNames.map((n) => `"${n}"`).join(', ')}, or "Other"), ` +
      `and an optional confidence between 0 and 1.`;

    const schemaHint = `{"assignments":[{"review_id":"string","theme_name":"string","confidence":0.9}]}`;

    const raw = await groqJson<unknown>({ system, user, schemaHint });
    const parsed = AssignResponseSchema.parse(raw);
    results.push(...parsed.assignments);
  }

  return results;
}

/**
 * Persist assignments to the review_themes table (bulk upsert).
 * Looks up theme_id from the theme name; "Other" assignments are skipped.
 */
export function persistAssignments(
  assignments: Assignment[],
  themes: { id: number; name: string }[]
): number {
  const themeMap = new Map(themes.map((t) => [t.name, t.id]));

  const stmt = db.prepare(`
    INSERT INTO review_themes (review_id, theme_id, confidence)
    VALUES (?, ?, ?)
    ON CONFLICT(review_id, theme_id) DO UPDATE SET confidence = excluded.confidence;
  `);

  let count = 0;
  const tx = db.transaction(() => {
    for (const a of assignments) {
      const themeId = themeMap.get(a.theme_name);
      if (!themeId) continue; // skip "Other" or unknown
      stmt.run(a.review_id, themeId, a.confidence ?? null);
      count++;
    }
  });

  tx();
  return count;
}

/**
 * Convenience: load a week's reviews + latest themes, assign, persist, and return stats.
 */
export async function assignWeekReviews(
  weekStart: string
): Promise<{ assigned: number; skipped: number; themes: number }> {
  const reviews = listReviewsForWeek(weekStart);
  const themes = listLatestThemes(5);

  const assignments = await assignReviewsToThemes(reviews, themes);
  const assigned = persistAssignments(assignments, themes);
  const skipped = assignments.length - assigned;

  return { assigned, skipped, themes: themes.length };
}
