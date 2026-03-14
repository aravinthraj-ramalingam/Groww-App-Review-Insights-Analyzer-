"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("../config/env");
const db_1 = require("../db");
const logger_1 = require("../core/logger");
// ── Service imports ──────────────────────────────────────────────────────────
const reviewsRepo_1 = require("../services/reviewsRepo");
const themeService_1 = require("../services/themeService");
const assignmentService_1 = require("../services/assignmentService");
const pulseService_1 = require("../services/pulseService");
const emailService_1 = require("../services/emailService");
const userPrefsRepo_1 = require("../services/userPrefsRepo");
const schedulerJob_1 = require("../jobs/schedulerJob");
const db_2 = require("../db");
// ── Init ─────────────────────────────────────────────────────────────────────
(0, db_1.initSchema)();
const app = (0, express_1.default)();
exports.app = app;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));
// ──────────────────────────────────────────────────────────────────────────────
//  DASHBOARD & STATS ROUTES
// ──────────────────────────────────────────────────────────────────────────────
/** GET /api/reviews/stats — get dashboard statistics */
app.get('/api/reviews/stats', (_req, res) => {
    try {
        const totalReviews = db_2.db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;
        const totalThemes = db_2.db.prepare('SELECT COUNT(*) as count FROM themes').get().count;
        const weeksCovered = db_2.db.prepare('SELECT COUNT(DISTINCT week_start) as count FROM reviews').get().count;
        const lastPulse = db_2.db.prepare('SELECT week_start FROM weekly_pulses ORDER BY created_at DESC LIMIT 1').get();
        res.json({
            ok: true,
            stats: {
                totalReviews,
                totalThemes,
                weeksCovered,
                lastPulseDate: lastPulse?.week_start || null
            }
        });
    }
    catch (err) {
        (0, logger_1.logError)('Error getting stats', err);
        res.status(500).json({ ok: false, error: 'Failed to get stats' });
    }
});
/** GET /api/reviews — list reviews with optional filters */
app.get('/api/reviews', (req, res) => {
    try {
        const { week_start, minRating, maxRating } = req.query;
        let query = 'SELECT id, platform, rating, title, text, clean_text, created_at, week_start, week_end FROM reviews WHERE 1=1';
        const params = [];
        if (week_start) {
            query += ' AND week_start = ?';
            params.push(week_start);
        }
        if (minRating) {
            query += ' AND rating >= ?';
            params.push(parseInt(minRating));
        }
        if (maxRating) {
            query += ' AND rating <= ?';
            params.push(parseInt(maxRating));
        }
        query += ' ORDER BY created_at DESC LIMIT 500';
        const reviews = db_2.db.prepare(query).all(...params);
        res.json({ ok: true, reviews });
    }
    catch (err) {
        (0, logger_1.logError)('Error listing reviews', err);
        res.status(500).json({ ok: false, error: 'Failed to list reviews' });
    }
});
/** POST /api/reviews/scrape — trigger review scraping */
app.post('/api/reviews/scrape', async (_req, res) => {
    try {
        // For now, return a message that scraping is done via phase-1
        res.json({
            ok: true,
            message: 'Please use Phase 1 API for scraping. Run: cd phase-1 && npm run scrape'
        });
    }
    catch (err) {
        (0, logger_1.logError)('Error scraping reviews', err);
        res.status(500).json({ ok: false, error: 'Failed to scrape reviews' });
    }
});
// ──────────────────────────────────────────────────────────────────────────────
//  THEME ROUTES
// ──────────────────────────────────────────────────────────────────────────────
/** POST /api/themes/generate — use recent reviews to generate and store 3-5 themes */
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
/** GET /api/themes — list the latest themes */
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
/** POST /api/themes/assign — assign reviews for a week to the latest themes */
app.post('/api/themes/assign', async (req, res) => {
    try {
        const weekStart = req.body?.week_start;
        if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
            res.status(400).json({ ok: false, error: 'week_start (YYYY-MM-DD) is required' });
            return;
        }
        const stats = await (0, assignmentService_1.assignWeekReviews)(weekStart);
        res.json({ ok: true, ...stats });
    }
    catch (err) {
        (0, logger_1.logError)('Error assigning themes', err);
        res.status(500).json({ ok: false, error: String(err.message) });
    }
});
// ──────────────────────────────────────────────────────────────────────────────
//  PULSE ROUTES
// ──────────────────────────────────────────────────────────────────────────────
/** POST /api/pulses/generate — generate weekly pulse for a given week */
app.post('/api/pulses/generate', async (req, res) => {
    try {
        const weekStart = req.body?.week_start;
        if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
            res.status(400).json({ ok: false, error: 'week_start (YYYY-MM-DD) is required' });
            return;
        }
        const pulse = await (0, pulseService_1.generatePulse)(weekStart);
        res.json({ ok: true, pulse });
    }
    catch (err) {
        (0, logger_1.logError)('Error generating pulse', err);
        res.status(500).json({ ok: false, error: String(err.message) });
    }
});
/** GET /api/pulses — list recent pulses */
app.get('/api/pulses', (_req, res) => {
    try {
        const pulses = (0, pulseService_1.listPulses)(20);
        res.json({ ok: true, pulses });
    }
    catch (err) {
        (0, logger_1.logError)('Error listing pulses', err);
        res.status(500).json({ ok: false, error: 'Failed to list pulses' });
    }
});
/** GET /api/pulses/:id — get a single pulse */
app.get('/api/pulses/:id', (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, error: 'Invalid pulse id' });
            return;
        }
        const pulse = (0, pulseService_1.getPulse)(id);
        if (!pulse) {
            res.status(404).json({ ok: false, error: 'Pulse not found' });
            return;
        }
        res.json({ ok: true, pulse });
    }
    catch (err) {
        (0, logger_1.logError)('Error getting pulse', err);
        res.status(500).json({ ok: false, error: 'Failed to get pulse' });
    }
});
/** POST /api/pulses/:id/send-email — email a pulse; body: { to? } */
app.post('/api/pulses/:id/send-email', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ ok: false, error: 'Invalid pulse id' });
            return;
        }
        const pulse = (0, pulseService_1.getPulse)(id);
        if (!pulse) {
            res.status(404).json({ ok: false, error: 'Pulse not found' });
            return;
        }
        // Use explicit `to` from body, fall back to active user preference email
        let to = req.body?.to;
        if (!to) {
            const prefs = (0, userPrefsRepo_1.getUserPrefs)();
            if (!prefs) {
                res.status(400).json({ ok: false, error: 'No recipient: provide `to` or save user preferences first' });
                return;
            }
            to = prefs.email;
        }
        await (0, emailService_1.sendPulseEmail)(to, pulse);
        res.json({ ok: true, message: `Pulse #${id} sent to ${to}` });
    }
    catch (err) {
        (0, logger_1.logError)('Error sending pulse email', err);
        res.status(500).json({ ok: false, error: String(err.message) });
    }
});
// ──────────────────────────────────────────────────────────────────────────────
//  USER PREFERENCE ROUTES
// ──────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/user-preferences
 * Body: { email, timezone, preferred_day_of_week, preferred_time }
 */
app.post('/api/user-preferences', (req, res) => {
    try {
        const { email, timezone, preferred_day_of_week, preferred_time } = req.body ?? {};
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            res.status(400).json({ ok: false, error: 'Valid email is required' });
            return;
        }
        if (!timezone || typeof timezone !== 'string') {
            res.status(400).json({ ok: false, error: 'timezone is required (e.g. "Asia/Kolkata")' });
            return;
        }
        if (typeof preferred_day_of_week !== 'number' || preferred_day_of_week < 0 || preferred_day_of_week > 6) {
            res.status(400).json({ ok: false, error: 'preferred_day_of_week must be 0 (Sun) – 6 (Sat)' });
            return;
        }
        if (!preferred_time || !/^\d{2}:\d{2}$/.test(preferred_time)) {
            res.status(400).json({ ok: false, error: 'preferred_time must be "HH:MM" (24h)' });
            return;
        }
        const saved = (0, userPrefsRepo_1.upsertUserPrefs)({ email, timezone, preferred_day_of_week, preferred_time });
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        res.json({
            ok: true,
            preferences: saved,
            confirmation: `You will receive your weekly pulse every ${dayNames[preferred_day_of_week]} at ${preferred_time} (${timezone}) to ${email}.`
        });
    }
    catch (err) {
        (0, logger_1.logError)('Error saving user preferences', err);
        res.status(500).json({ ok: false, error: 'Failed to save preferences' });
    }
});
/** GET /api/user-preferences — get current active preferences */
app.get('/api/user-preferences', (_req, res) => {
    try {
        const prefs = (0, userPrefsRepo_1.getUserPrefs)();
        if (!prefs) {
            res.status(404).json({ ok: false, error: 'No preferences configured yet' });
            return;
        }
        res.json({ ok: true, preferences: prefs });
    }
    catch (err) {
        (0, logger_1.logError)('Error getting user preferences', err);
        res.status(500).json({ ok: false, error: 'Failed to get preferences' });
    }
});
// ──────────────────────────────────────────────────────────────────────────────
//  EMAIL TEST ROUTE
// ──────────────────────────────────────────────────────────────────────────────
/** POST /api/email/test — send a test email to verify SMTP setup */
app.post('/api/email/test', async (req, res) => {
    try {
        const to = req.body?.to;
        if (!to || !to.includes('@')) {
            res.status(400).json({ ok: false, error: 'Valid `to` email is required' });
            return;
        }
        await (0, emailService_1.sendTestEmail)(to);
        res.json({ ok: true, message: `Test email sent to ${to}` });
    }
    catch (err) {
        (0, logger_1.logError)('Error sending test email', err);
        res.status(500).json({ ok: false, error: String(err.message) });
    }
});
// ──────────────────────────────────────────────────────────────────────────────
//  CONVENIENCE ROUTE
// ──────────────────────────────────────────────────────────────────────────────
/** GET /api/reviews/week/:weekStart — list a week's reviews (debug helper) */
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
// ──────────────────────────────────────────────────────────────────────────────
//  Start server + scheduler
// ──────────────────────────────────────────────────────────────────────────────
const port = env_1.config.port;
app.listen(port, () => {
    (0, logger_1.logInfo)(`Phase 2 API server running on port ${port}`, { databaseFile: env_1.config.databaseFile });
    // Start scheduler (every 5 minutes by default) only if GROQ_API_KEY is present
    if (env_1.config.groqApiKey) {
        (0, schedulerJob_1.startScheduler)();
    }
    else {
        (0, logger_1.logInfo)('Scheduler NOT started – set GROQ_API_KEY to enable automatic pulse delivery.');
    }
});
