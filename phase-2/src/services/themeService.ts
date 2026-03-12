import { z } from 'zod';
import { db } from '../db';
import { groqJson } from './groqClient';
import { ReviewRow } from '../domain/review';

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
    'Do not include any personally identifying information. Do not include usernames, emails, phone numbers, IDs, or links.';

  const user =
    `Analyze the following Groww Android app reviews and propose 3 to 5 themes max.\n` +
    `Each theme must have a short name and a one-sentence description.\n\n` +
    sample.map((t, i) => `- (${i + 1}) ${t}`).join('\n');

  const schemaHint = `{"themes":[{"name":"string","description":"string"}]}`;

  const raw = await groqJson<unknown>({ system, user, schemaHint });
  const parsed = GenerateThemesResponseSchema.parse(raw);
  return parsed.themes;
}

export function upsertThemes(themes: ThemeDef[], window?: { from?: string; to?: string }): number[] {
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO themes (name, description, created_at, valid_from, valid_to)
    VALUES (?, ?, ?, ?, ?)
  `);

  const ids: number[] = [];
  const tx = db.transaction(() => {
    for (const t of themes) {
      const info = insert.run(t.name, t.description, now, window?.from ?? null, window?.to ?? null);
      ids.push(Number(info.lastInsertRowid));
    }
  });

  tx();
  return ids;
}

export function listLatestThemes(limit = 5): { id: number; name: string; description: string }[] {
  const stmt = db.prepare(`
    SELECT id, name, description
    FROM themes
    ORDER BY created_at DESC
    LIMIT ?;
  `);
  return stmt.all(limit) as any[];
}

