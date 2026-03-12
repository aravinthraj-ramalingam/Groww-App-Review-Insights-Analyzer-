"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRecentReviews = listRecentReviews;
exports.listReviewsForWeek = listReviewsForWeek;
const db_1 = require("../db");
function listRecentReviews(weeksBack, limit) {
    const stmt = db_1.db.prepare(`
    SELECT id, rating, title, text, clean_text, created_at, week_start, week_end
    FROM reviews
    WHERE date(created_at) >= date('now', ?)
    ORDER BY created_at DESC
    LIMIT ?;
  `);
    const since = `-${Math.max(1, weeksBack * 7)} days`;
    return stmt.all(since, limit);
}
function listReviewsForWeek(weekStart) {
    const stmt = db_1.db.prepare(`
    SELECT id, rating, title, text, clean_text, created_at, week_start, week_end
    FROM reviews
    WHERE week_start = ?
    ORDER BY created_at DESC;
  `);
    return stmt.all(weekStart);
}
