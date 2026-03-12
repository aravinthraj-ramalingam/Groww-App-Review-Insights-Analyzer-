"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeAndStoreReviews = scrapeAndStoreReviews;
exports.listReviews = listReviews;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const db_1 = require("../db");
const playstoreScraper_1 = require("../scraper/playstoreScraper");
const logger_1 = require("../core/logger");
(0, db_1.initSchema)();
async function scrapeAndStoreReviews(maxReviews) {
    const reviews = await (0, playstoreScraper_1.scrapeFilteredReviews)({ maxReviews });
    (0, logger_1.logInfo)('Scrape finished, about to persist reviews', { toInsert: reviews.length });
    if (reviews.length === 0) {
        return { inserted: 0 };
    }
    const insert = db_1.db.prepare(`
    INSERT OR REPLACE INTO reviews (
      id, platform, rating, title, text, clean_text, created_at, week_start, week_end, raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);
    const transaction = db_1.db.transaction((items) => {
        for (const r of items) {
            insert.run(r.id, r.platform, r.rating, r.title, r.text, r.cleanText, r.createdAt.toISOString(), r.weekStart, r.weekEnd, JSON.stringify(r.rawPayload ?? null));
        }
    });
    transaction(reviews);
    // Write a debug JSON file with all scraped reviews for easy inspection.
    try {
        const debugPath = path_1.default.join(process.cwd(), 'scraped-reviews.json');
        (0, fs_1.writeFileSync)(debugPath, JSON.stringify(reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            text: r.text,
            cleanText: r.cleanText,
            createdAt: r.createdAt.toISOString(),
            weekStart: r.weekStart,
            weekEnd: r.weekEnd
        })), null, 2), 'utf8');
        (0, logger_1.logInfo)('Wrote scraped reviews JSON file', { path: debugPath });
    }
    catch {
        // Ignore JSON file write errors in phase 1.
    }
    const countRow = db_1.db.prepare('SELECT COUNT(*) as cnt FROM reviews').get();
    (0, logger_1.logInfo)('Scrape and store complete', { inserted: reviews.length, totalInDb: countRow.cnt });
    return { inserted: reviews.length };
}
function listReviews(limit = 100) {
    const stmt = db_1.db.prepare(`
    SELECT id, platform, rating, title, text, clean_text, created_at, week_start, week_end, raw_payload
    FROM reviews
    ORDER BY created_at DESC
    LIMIT ?;
  `);
    const rows = stmt.all(limit);
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
