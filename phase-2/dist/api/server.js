"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const env_1 = require("../config/env");
const db_1 = require("../db");
const logger_1 = require("../core/logger");
const reviewsRepo_1 = require("../services/reviewsRepo");
const themeService_1 = require("../services/themeService");
(0, db_1.initSchema)();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get('/health', (_req, res) => res.json({ ok: true }));
// Phase 2: generate 3-5 themes using Groq and persist them
app.post('/api/themes/generate', async (req, res) => {
    try {
        const weeksBack = typeof req.body?.weeksBack === 'number' ? req.body.weeksBack : 12;
        const limit = typeof req.body?.limit === 'number' ? req.body.limit : 800;
        const reviews = (0, reviewsRepo_1.listRecentReviews)(weeksBack, limit);
        (0, logger_1.logInfo)('Generating themes', { weeksBack, limit, reviewCount: reviews.length });
        const themes = await (0, themeService_1.generateThemesFromReviews)(reviews);
        const ids = (0, themeService_1.upsertThemes)(themes);
        res.json({ ok: true, themes: themes.map((t, i) => ({ id: ids[i], ...t })) });
    }
    catch (err) {
        (0, logger_1.logError)('Error generating themes', err);
        res.status(500).json({ ok: false, error: 'Failed to generate themes' });
    }
});
app.get('/api/themes', (_req, res) => {
    try {
        const themes = (0, themeService_1.listLatestThemes)(5);
        res.json({ ok: true, themes });
    }
    catch (err) {
        (0, logger_1.logError)('Error listing themes', err);
        res.status(500).json({ ok: false, error: 'Failed to list themes' });
    }
});
// Convenience: list a week’s reviews (for debugging)
app.get('/api/reviews/week/:weekStart', (req, res) => {
    try {
        const weekStart = req.params.weekStart;
        const reviews = (0, reviewsRepo_1.listReviewsForWeek)(weekStart);
        res.json({ ok: true, reviews });
    }
    catch (err) {
        (0, logger_1.logError)('Error listing week reviews', err);
        res.status(500).json({ ok: false, error: 'Failed to list week reviews' });
    }
});
const port = env_1.config.port;
app.listen(port, () => {
    (0, logger_1.logInfo)(`Phase 2 API server running on port ${port}`, { databaseFile: env_1.config.databaseFile });
});
