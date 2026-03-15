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
    'You are a product analyst. Analyze app store reviews and identify 3 to 5 DISTINCT categories of feedback. ' +
    'Each category must be fundamentally different from the others (e.g., Technical Issues, Pricing, Customer Service, UI/UX, Features). ' +
    'Do not paraphrase the same concept with different wording. ' +
    'Ensure no two categories overlap in meaning. ' +
    'Do not include any personally identifying information.';

  const user =
    `Analyze the following Groww Android app reviews and identify 3 to 5 DISTINCT categories of feedback.\n\n` +
    `CRITICAL REQUIREMENTS:\n` +
    `1. Each category must be fundamentally DIFFERENT from the others\n` +
    `2. Do NOT paraphrase the same concept (e.g., "Technical Issues" and "Technical Problems" are the same)\n` +
    `3. Examples of distinct categories: Technical Issues, Pricing/Value, Customer Support, UI/UX Design, Features/Functionality\n` +
    `4. Output theme names in Title Case with proper spacing (e.g., "Technical Issues", not "TechnicalIssues")\n\n` +
    `Reviews:\n` +
    sample.map((t, i) => `- (${i + 1}) ${t}`).join('\n');

  const schemaHint = `{"themes":[{"name":"Title Case Theme Name","description":"One sentence description"}]}`;

  const raw = await groqJson<unknown>({ system, user, schemaHint });
  const parsed = GenerateThemesResponseSchema.parse(raw);
  
  // Deduplicate themes by semantic similarity (check for overlapping words)
  const uniqueThemes: ThemeDef[] = [];
  for (const theme of parsed.themes) {
    const normalizedName = theme.name.toLowerCase().trim();
    const nameWords = normalizedName.split(/\s+/);
    
    // Check if this theme is too similar to existing ones
    let isDuplicate = false;
    for (const existing of uniqueThemes) {
      const existingNormalized = existing.name.toLowerCase().trim();
      const existingWords = existingNormalized.split(/\s+/);
      
      // Check for significant word overlap
      const commonWords = nameWords.filter(w => existingWords.includes(w));
      if (commonWords.length >= Math.min(nameWords.length, existingWords.length) * 0.5) {
        isDuplicate = true;
        break;
      }
      
      // Check if one contains the other
      if (normalizedName.includes(existingNormalized) || existingNormalized.includes(normalizedName)) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      uniqueThemes.push(theme);
    }
  }
  
  return uniqueThemes.slice(0, 5);
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

