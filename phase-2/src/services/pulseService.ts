import { z } from 'zod';
import { dbAdapter } from '../db/dbAdapter';
import { groqJson } from './groqClient';
import { listReviewsForWeek } from './reviewsRepo';
import { listLatestThemes } from './themeService';
import { ReviewRow } from '../domain/review';
import { scrubPii } from './piiScrubber';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ThemeSummary {
  theme_id: number;
  name: string;
  description: string;
  review_count: number;
  avg_rating: number;
}

export interface Quote {
  text: string;
  rating: number;
}

export interface ActionIdea {
  idea: string;
}

export interface WeeklyPulse {
  id: number;
  week_start: string;
  week_end: string;
  top_themes: ThemeSummary[];
  user_quotes: Quote[];
  action_ideas: ActionIdea[];
  note_body: string;
  created_at: string;
  version: number;
}

// ── Zod schemas ─────────────────────────────────────────────────────────────

const ActionIdeasResponseSchema = z.object({
  action_ideas: z.array(z.object({ idea: z.string().min(5).max(300) })).length(3)
});

const WeeklyNoteResponseSchema = z.object({
  note: z.string().min(10).max(2000)
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Aggregate per-theme stats for a given week from the review_themes join.
 */
async function getWeekThemeStats(weekStart: string): Promise<ThemeSummary[]> {
  const result = await dbAdapter.query(
    `SELECT t.id AS theme_id, t.name, t.description,
            COUNT(rt.review_id) AS review_count,
            ROUND(AVG(r.rating), 2) AS avg_rating
     FROM themes t
     JOIN review_themes rt ON rt.theme_id = t.id
     JOIN reviews r ON r.id = rt.review_id
     WHERE r.week_start = ?
     GROUP BY t.id
     ORDER BY review_count DESC`,
    [weekStart]
  );
  return result.rows as ThemeSummary[];
}

/**
 * Pick up to 3 short, PII-free quotes per theme for the top themes.
 */
async function pickQuotes(topThemeIds: number[], reviews: ReviewRow[]): Promise<Quote[]> {
  const quotes: Quote[] = [];
  const usedTexts = new Set<string>();

  for (const themeId of topThemeIds) {
    const result = await dbAdapter.query(
      `SELECT review_id FROM review_themes WHERE theme_id = ?`,
      [themeId]
    );
    const themeReviewIds = (result.rows as { review_id: string }[]).map((r) => r.review_id);

    const candidates = reviews
      .filter((r) => themeReviewIds.includes(r.id))
      .map((r) => ({ text: (r.clean_text || r.text).slice(0, 200).trim(), rating: r.rating }))
      .filter((q) => q.text.length > 30 && !usedTexts.has(q.text));

    if (candidates.length > 0) {
      const chosen = candidates[0];
      usedTexts.add(chosen.text);
      quotes.push(chosen);
    }

    if (quotes.length >= 3) break;
  }

  return quotes;
}

// ── Core generation ──────────────────────────────────────────────────────────

async function generateActionIdeas(
  topThemes: ThemeSummary[],
  quotes: Quote[]
): Promise<ActionIdea[]> {
  const system =
    'You are a product analyst. Suggest 3 concrete, actionable improvement ideas for a fintech app ' +
    'based on user review themes and quotes. No PII. No usernames, emails, or phone numbers.';

  const themeText = topThemes
    .map((t) => `- ${t.name} (${t.review_count} reviews, avg rating ${t.avg_rating}): ${t.description}`)
    .join('\n');

  const quotesText = quotes.map((q) => `"${q.text}"`).join('\n');

  const user =
    `Top themes this week:\n${themeText}\n\n` +
    `Sample user quotes:\n${quotesText}\n\n` +
    `Provide exactly 3 concise action ideas (each ≤60 words).`;

  const schemaHint = `{"action_ideas":[{"idea":"string"},{"idea":"string"},{"idea":"string"}]}`;

  const raw = await groqJson<unknown>({ system, user, schemaHint });
  return ActionIdeasResponseSchema.parse(raw).action_ideas;
}

async function generateWeeklyNote(
  weekStart: string,
  topThemes: ThemeSummary[],
  quotes: Quote[],
  actionIdeas: ActionIdea[],
  maxWords = 250
): Promise<string> {
  const system =
    'You are a product analyst writing an internal weekly pulse email for the Groww app. ' +
    `Write a scannable note of STRICTLY ≤${maxWords} words. No PII.`;

  const themeText = topThemes.map((t) => `• ${t.name}: ${t.description}`).join('\n');
  const quoteText = quotes.map((q, i) => `${i + 1}. "${q.text}" (${q.rating}★)`).join('\n');
  const actionText = actionIdeas.map((a, i) => `${i + 1}. ${a.idea}`).join('\n');

  const user =
    `Generate a weekly pulse note for the week starting ${weekStart}.\n\n` +
    `Top 3 Themes:\n${themeText}\n\n` +
    `User Quotes:\n${quoteText}\n\n` +
    `Recommended Actions:\n${actionText}\n\n` +
    `The note must have: a short intro, a themes section, a quotes section, and an actions section. ` +
    `Total MUST be ≤${maxWords} words.`;

  const schemaHint = `{"note":"string (≤${maxWords} words)"}`;

  const raw = await groqJson<unknown>({ system, user, schemaHint });
  let note = WeeklyNoteResponseSchema.parse(raw).note;

  // Word count guard: re-generate with stricter prompt if needed
  if (countWords(note) > maxWords) {
    const retryUser =
      `${user}\n\nPREVIOUS ATTEMPT HAD TOO MANY WORDS. ` +
      `You MUST keep the total to ≤${maxWords} words. Trim aggressively.`;
    const raw2 = await groqJson<unknown>({ system, user: retryUser, schemaHint });
    note = WeeklyNoteResponseSchema.parse(raw2).note;
  }

  return scrubPii(note);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate (or regenerate) the weekly pulse for the given week_start (YYYY-MM-DD).
 */
export async function generatePulse(weekStart: string): Promise<WeeklyPulse> {
  const themes = await listLatestThemes(5);
  if (themes.length === 0) {
    throw new Error('No themes found. Run POST /api/themes/generate first.');
  }

  const reviews = await listReviewsForWeek(weekStart);
  if (reviews.length === 0) {
    throw new Error(`No reviews found for week ${weekStart}. Ensure theme assignment has run.`);
  }

  // Compute week_end (6 days after week_start)
  const wsDate = new Date(weekStart);
  const weDate = new Date(wsDate);
  weDate.setUTCDate(wsDate.getUTCDate() + 6);
  const weekEnd = weDate.toISOString().slice(0, 10);

  // Aggregate stats + pick top 3 themes
  const themeStats = await getWeekThemeStats(weekStart);
  const topThemes = themeStats.slice(0, 3);

  // If no theme assignments yet, fall back to global themes with 0 counts
  // Ensure unique themes by name
  const uniqueThemes = themes.filter((t, index, self) => 
    index === self.findIndex((tt) => tt.name === t.name)
  );
  
  const effectiveTopThemes: ThemeSummary[] =
    topThemes.length >= 1
      ? topThemes
      : uniqueThemes.slice(0, 3).map((t) => ({
          theme_id: t.id,
          name: t.name,
          description: t.description,
          review_count: 0,
          avg_rating: 0
        }));

  const topThemeIds = effectiveTopThemes.map((t) => t.theme_id);
  const quotes = await pickQuotes(topThemeIds, reviews);
  const actionIdeas = await generateActionIdeas(effectiveTopThemes, quotes);
  const noteBody = await generateWeeklyNote(weekStart, effectiveTopThemes, quotes, actionIdeas);

  // Determine version (increment if week already exists)
  const existing = await dbAdapter.queryOne(
    `SELECT MAX(version) as v FROM weekly_pulses WHERE week_start = ?`,
    [weekStart]
  ) as { v: number | null } | null;
  const version = (existing?.v ?? 0) + 1;

  const now = new Date().toISOString();
  const result = await dbAdapter.run(
    `INSERT INTO weekly_pulses (week_start, week_end, top_themes, user_quotes, action_ideas, note_body, created_at, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      weekStart,
      weekEnd,
      JSON.stringify(effectiveTopThemes),
      JSON.stringify(quotes),
      JSON.stringify(actionIdeas),
      noteBody,
      now,
      version
    ]
  );

  return (await getPulse(result.lastID!))!;
}

export async function getPulse(id: number): Promise<WeeklyPulse | null> {
  const row = await dbAdapter.queryOne(`SELECT * FROM weekly_pulses WHERE id = ?`, [id]);
  if (!row) return null;
  return {
    ...row,
    top_themes: JSON.parse(row.top_themes),
    user_quotes: JSON.parse(row.user_quotes),
    action_ideas: JSON.parse(row.action_ideas)
  };
}

export async function listPulses(limit = 10): Promise<WeeklyPulse[]> {
  const result = await dbAdapter.query(
    `SELECT * FROM weekly_pulses ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
  return result.rows.map((row: any) => ({
    ...row,
    top_themes: JSON.parse(row.top_themes),
    user_quotes: JSON.parse(row.user_quotes),
    action_ideas: JSON.parse(row.action_ideas)
  }));
}
