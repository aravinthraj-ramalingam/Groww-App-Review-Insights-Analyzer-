"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const env_1 = require("../config/env");
const logger_1 = require("../core/logger");
const reviewService_1 = require("../services/reviewService");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post('/api/reviews/scrape', async (req, res) => {
    try {
        const maxReviews = typeof req.body?.maxReviews === 'number' ? req.body.maxReviews : undefined;
        (0, logger_1.logInfo)('Received /api/reviews/scrape request', { maxReviews });
        const result = await (0, reviewService_1.scrapeAndStoreReviews)(maxReviews);
        res.json({ ok: true, ...result });
    }
    catch (err) {
        (0, logger_1.logError)('Error in /api/reviews/scrape', err);
        res.status(500).json({ ok: false, error: 'Failed to scrape reviews' });
    }
});
// Browser-friendly trigger (Postman Cloud Agent can't call localhost)
app.get('/api/reviews/scrape', async (req, res) => {
    try {
        const maxReviews = req.query.maxReviews ? Number(req.query.maxReviews) : undefined;
        (0, logger_1.logInfo)('Received GET /api/reviews/scrape request', { maxReviews });
        const result = await (0, reviewService_1.scrapeAndStoreReviews)(Number.isNaN(maxReviews) ? undefined : maxReviews);
        res.json({ ok: true, ...result });
    }
    catch (err) {
        (0, logger_1.logError)('Error in GET /api/reviews/scrape', err);
        res.status(500).json({ ok: false, error: 'Failed to scrape reviews' });
    }
});
app.get('/api/reviews', (req, res) => {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 100;
        const reviews = (0, reviewService_1.listReviews)(Number.isNaN(limit) ? 100 : limit);
        res.json({ ok: true, reviews });
    }
    catch (err) {
        (0, logger_1.logError)('Error in /api/reviews', err);
        res.status(500).json({ ok: false, error: 'Failed to list reviews' });
    }
});
const port = env_1.config.port;
app.listen(port, () => {
    (0, logger_1.logInfo)(`Phase 1 API server running on port ${port}`);
});
