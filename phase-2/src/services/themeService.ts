import { z } from 'zod';
import { dbAdapter } from '../db/dbAdapter';
import { groqJson } from './groqClient';
import { ReviewRow } from '../domain/review';
import { logInfo } from '../core/logger';

const ThemeSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().min(5).max(200)
});

const GenerateThemesResponseSchema = z.object({
  themes: z.array(ThemeSchema).min(3).max(5)
});

export type ThemeDef = z.infer<typeof ThemeSchema>;

export async function generateThemesFromReviews(reviews: ReviewRow[]): Promise<ThemeDef[]> {
  const sample = reviews
    .map((r) => (r.clean_text || r.text).slice(0, 400))
    .filter(Boolean)
    .slice(0, 120);

  const system =
    'You are a product analyst. You will propose 3 to 5 themes from app store reviews. ' +
    'Do not include any personally identifying information. Do not include usernames, emails, phone numbers, IDs, or links. ' +
    'Each theme must have a UNIQUE name - do not repeat the same theme name.';

  const user =
    `Analyze the following Groww Android app reviews and propose 3 to 5 themes max.\n` +
    `Each theme must have a short UNIQUE name and a one-sentence description.\n` +
    `Avoid duplicate theme names - each theme should be distinct.\n\n` +
    sample.map((t, i) => `- (${i + 1}) ${t}`).join('\n');

  const schemaHint = `{"themes":[{"name":"string","description":"string"}]}`;

  const raw = await groqJson<unknown>({ system, user, schemaHint });
  const parsed = GenerateThemesResponseSchema.parse(raw);
  
  // Deduplicate themes by name (case-insensitive)
  const seen = new Set<string>();
  const uniqueThemes = parsed.themes.filter(t => {
    const key = t.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  return uniqueThemes;
}

export async function upsertThemes(themes: ThemeDef[], window?: { from?: string; to?: string }): Promise<number[]> {
  const now = new Date().toISOString();
  const ids: number[] = [];
  
  for (const t of themes) {
    try {
      const result = await dbAdapter.run(
        `INSERT INTO themes (name, description, created_at, valid_from, valid_to)
         VALUES (?, ?, ?, ?, ?)`,
        [t.name, t.description, now, window?.from ?? null, window?.to ?? null]
      );
      ids.push(result.lastID!);
    } catch (err: any) {
      // If duplicate theme name exists, skip it
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        logInfo('Skipping duplicate theme', { name: t.name });
        continue;
      }
      throw err;
    }
  }
  
  return ids;
}

export async function listLatestThemes(limit = 5): Promise<{ id: number; name: string; description: string }[]> {
  const result = await dbAdapter.query(
    `SELECT id, name, description
     FROM themes
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );
  return result.rows;
}

