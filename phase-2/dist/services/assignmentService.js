"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignReviewsToThemes = assignReviewsToThemes;
exports.persistAssignments = persistAssignments;
exports.assignWeekReviews = assignWeekReviews;
const zod_1 = require("zod");
const db_1 = require("../db");
const groqClient_1 = require("./groqClient");
const themeService_1 = require("./themeService");
const reviewsRepo_1 = require("./reviewsRepo");
// ----- Zod schemas -----
const AssignmentSchema = zod_1.z.object({
    review_id: zod_1.z.string(),
    theme_name: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1).optional()
});
const AssignResponseSchema = zod_1.z.object({
    assignments: zod_1.z.array(AssignmentSchema)
});
const BATCH_SIZE = 10;
/**
 * Call Groq to assign each review to one of the provided theme names (or "Other").
 * Processes reviews in batches of BATCH_SIZE to control token usage.
 */
async function assignReviewsToThemes(reviews, themes) {
    if (reviews.length === 0 || themes.length === 0)
        return [];
    const themeNames = themes.map((t) => t.name);
    const themeListText = themes
        .map((t) => `- ${t.name}: ${t.description}`)
        .join('\n');
    const system = 'You are a product analyst assigning app review feedback to predefined themes. ' +
        'Do NOT include any personally identifying information in your responses.';
    const results = [];
    for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
        const batch = reviews.slice(i, i + BATCH_SIZE);
        const reviewsText = batch
            .map((r, idx) => `[${idx}] id="${r.id}" text="${(r.clean_text || r.text).slice(0, 300)}"`)
            .join('\n');
        const user = `You are given a list of Groww Android app reviews and a list of allowed themes.\n` +
            `Assign each review to exactly ONE theme from the list below, or use "Other" if none fits.\n\n` +
            `Themes:\n${themeListText}\n\n` +
            `Reviews:\n${reviewsText}\n\n` +
            `For each review return its id, the theme_name (must be one of: ${themeNames.map((n) => `"${n}"`).join(', ')}, or "Other"), ` +
            `and an optional confidence between 0 and 1.`;
        const schemaHint = `{"assignments":[{"review_id":"string","theme_name":"string","confidence":0.9}]}`;
        const raw = await (0, groqClient_1.groqJson)({ system, user, schemaHint });
        const parsed = AssignResponseSchema.parse(raw);
        results.push(...parsed.assignments);
    }
    return results;
}
/**
 * Persist assignments to the review_themes table (bulk upsert).
 * Looks up theme_id from the theme name; "Other" assignments are skipped.
 */
function persistAssignments(assignments, themes) {
    const themeMap = new Map(themes.map((t) => [t.name, t.id]));
    const stmt = db_1.db.prepare(`
    INSERT INTO review_themes (review_id, theme_id, confidence)
    VALUES (?, ?, ?)
    ON CONFLICT(review_id, theme_id) DO UPDATE SET confidence = excluded.confidence;
  `);
    let count = 0;
    const tx = db_1.db.transaction(() => {
        for (const a of assignments) {
            const themeId = themeMap.get(a.theme_name);
            if (!themeId)
                continue; // skip "Other" or unknown
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
async function assignWeekReviews(weekStart) {
    const reviews = (0, reviewsRepo_1.listReviewsForWeek)(weekStart);
    const themes = (0, themeService_1.listLatestThemes)(5);
    const assignments = await assignReviewsToThemes(reviews, themes);
    const assigned = persistAssignments(assignments, themes);
    const skipped = assignments.length - assigned;
    return { assigned, skipped, themes: themes.length };
}
