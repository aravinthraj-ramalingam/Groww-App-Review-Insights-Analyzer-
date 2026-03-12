"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateThemesFromReviews = generateThemesFromReviews;
exports.upsertThemes = upsertThemes;
exports.listLatestThemes = listLatestThemes;
const zod_1 = require("zod");
const db_1 = require("../db");
const groqClient_1 = require("./groqClient");
const ThemeSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(60),
    description: zod_1.z.string().min(5).max(200)
});
const GenerateThemesResponseSchema = zod_1.z.object({
    themes: zod_1.z.array(ThemeSchema).min(3).max(5)
});
async function generateThemesFromReviews(reviews) {
    const sample = reviews
        .map((r) => (r.clean_text || r.text).slice(0, 400))
        .filter(Boolean)
        .slice(0, 120);
    const system = 'You are a product analyst. You will propose 3 to 5 themes from app store reviews. ' +
        'Do not include any personally identifying information. Do not include usernames, emails, phone numbers, IDs, or links.';
    const user = `Analyze the following Groww Android app reviews and propose 3 to 5 themes max.\n` +
        `Each theme must have a short name and a one-sentence description.\n\n` +
        sample.map((t, i) => `- (${i + 1}) ${t}`).join('\n');
    const schemaHint = `{"themes":[{"name":"string","description":"string"}]}`;
    const raw = await (0, groqClient_1.groqJson)({ system, user, schemaHint });
    const parsed = GenerateThemesResponseSchema.parse(raw);
    return parsed.themes;
}
function upsertThemes(themes, window) {
    const now = new Date().toISOString();
    const insert = db_1.db.prepare(`
    INSERT INTO themes (name, description, created_at, valid_from, valid_to)
    VALUES (?, ?, ?, ?, ?)
  `);
    const ids = [];
    const tx = db_1.db.transaction(() => {
        for (const t of themes) {
            const info = insert.run(t.name, t.description, now, window?.from ?? null, window?.to ?? null);
            ids.push(Number(info.lastInsertRowid));
        }
    });
    tx();
    return ids;
}
function listLatestThemes(limit = 5) {
    const stmt = db_1.db.prepare(`
    SELECT id, name, description
    FROM themes
    ORDER BY created_at DESC
    LIMIT ?;
  `);
    return stmt.all(limit);
}
