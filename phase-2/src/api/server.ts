import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from '../config/env';
import { initSchema, db, isPostgres, getPool } from '../db';
import { logError, logInfo } from '../core/logger';

// ── Service imports ──────────────────────────────────────────────────────────
import { listRecentReviews, listReviewsForWeek } from '../services/reviewsRepo';
import { generateThemesFromReviews, listLatestThemes, upsertThemes } from '../services/themeService';
import { assignWeekReviews } from '../services/assignmentService';
import { generatePulse, getPulse, listPulses } from '../services/pulseService';
import { sendPulseEmail, sendTestEmail } from '../services/emailService';
import { upsertUserPrefs, getUserPrefs } from '../services/userPrefsRepo';
import { startScheduler } from '../jobs/schedulerJob';

// ── Init ─────────────────────────────────────────────────────────────────────
initSchema().then(() => {
  logInfo('Database initialized');
}).catch(err => {
  logError('Failed to initialize database', err);
  process.exit(1);
});

const app = express();

// Configure CORS for production
const allowedOrigins = [
  'https://groww-app-review-insights-analyzer.vercel.app',
  'https://groww-app-review-insights-analyzer-m4q6espcq.vercel.app',
  'https://groww-app-review-insights-analyzer-git-main-aravinthraj-ramalingams-projects.vercel.app'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

// ──────────────────────────────────────────────────────────────────────────────
//  DASHBOARD & STATS ROUTES
// ──────────────────────────────────────────────────────────────────────────────

/** GET /api/reviews/stats — get dashboard statistics */
app.get('/api/reviews/stats', async (_req: Request, res: Response) => {
  try {
    if (isPostgres()) {
      // PostgreSQL path
      const pool = getPool();
      const totalReviewsResult = await pool.query('SELECT COUNT(*) as count FROM reviews');
      const totalThemesResult = await pool.query('SELECT COUNT(*) as count FROM themes');
      const weeksCoveredResult = await pool.query('SELECT COUNT(DISTINCT week_start) as count FROM reviews');
      const lastPulseResult = await pool.query('SELECT week_start FROM weekly_pulses ORDER BY created_at DESC LIMIT 1');
      
      res.json({
        ok: true,
        stats: {
          totalReviews: parseInt(totalReviewsResult.rows[0]?.count || '0'),
          totalThemes: parseInt(totalThemesResult.rows[0]?.count || '0'),
          weeksCovered: parseInt(weeksCoveredResult.rows[0]?.count || '0'),
          lastPulseDate: lastPulseResult.rows[0]?.week_start || null
        }
      });
    } else {
      // SQLite path
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'").get();
      if (!tableCheck) {
        return res.json({
          ok: true,
          stats: {
            totalReviews: 0,
            totalThemes: 0,
            weeksCovered: 0,
            lastPulseDate: null
          }
        });
      }
      
      const totalReviews = (db.prepare('SELECT COUNT(*) as count FROM reviews').get() as any)?.count || 0;
      const totalThemes = (db.prepare('SELECT COUNT(*) as count FROM themes').get() as any)?.count || 0;
      const weeksCovered = (db.prepare('SELECT COUNT(DISTINCT week_start) as count FROM reviews').get() as any)?.count || 0;
      const lastPulse = db.prepare('SELECT week_start FROM weekly_pulses ORDER BY created_at DESC LIMIT 1').get() as any;
      
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
  } catch (err: any) {
    logError('Error getting stats', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to get stats' });
  }
});

/** GET /api/reviews — list reviews with optional filters */
app.get('/api/reviews', async (req: Request, res: Response) => {
  try {
    const { week_start, minRating, maxRating } = req.query;
    
    let query = 'SELECT id, platform, rating, title, text, clean_text, created_at, week_start, week_end FROM reviews WHERE 1=1';
    const params: any[] = [];
    
    if (week_start) {
      query += ' AND week_start = $' + (params.length + 1);
      params.push(week_start);
    }
    if (minRating) {
      query += ' AND rating >= $' + (params.length + 1);
      params.push(parseInt(minRating as string));
    }
    if (maxRating) {
      query += ' AND rating <= $' + (params.length + 1);
      params.push(parseInt(maxRating as string));
    }
    
    query += ' ORDER BY created_at DESC LIMIT 500';
    
    if (isPostgres()) {
      const pool = getPool();
      const result = await pool.query(query, params);
      res.json({ ok: true, reviews: result.rows });
    } else {
      const reviews = db.prepare(query).all(...params);
      res.json({ ok: true, reviews });
    }
  } catch (err: any) {
    logError('Error listing reviews', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to list reviews' });
  }
});

/** POST /api/reviews/scrape — trigger review scraping */
app.post('/api/reviews/scrape', async (_req: Request, res: Response) => {
  try {
    // For now, return a message that scraping is done via phase-1
    res.json({ 
      ok: true, 
      message: 'Please use Phase 1 API for scraping. Run: cd phase-1 && npm run scrape' 
    });
  } catch (err) {
    logError('Error scraping reviews', err);
    res.status(500).json({ ok: false, error: 'Failed to scrape reviews' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
//  THEME ROUTES
// ──────────────────────────────────────────────────────────────────────────────

/** POST /api/themes/generate — use recent reviews to generate and store 3-5 themes */
app.post('/api/themes/generate', async (req: Request, res: Response) => {
  try {
    const weeksBack = typeof req.body?.weeksBack === 'number' ? req.body.weeksBack : 12;
    const limit = typeof req.body?.limit === 'number' ? req.body.limit : 800;
    const reviews = listRecentReviews(weeksBack, limit);
    logInfo('Generating themes', { weeksBack, limit, reviewCount: reviews.length });

    const themes = await generateThemesFromReviews(reviews);
    const ids = await upsertThemes(themes);
    res.json({ ok: true, themes: themes.map((t, i) => ({ id: ids[i], ...t })) });
  } catch (err: any) {
    logError('Error generating themes', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to generate themes' });
  }
});

/** GET /api/themes — list the latest themes */
app.get('/api/themes', async (_req: Request, res: Response) => {
  try {
    const themes = await listLatestThemes(5);
    res.json({ ok: true, themes });
  } catch (err: any) {
    logError('Error listing themes', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to list themes' });
  }
});

/** POST /api/themes/assign — assign reviews for a week to the latest themes */
app.post('/api/themes/assign', async (req: Request, res: Response) => {
  try {
    const weekStart: string = req.body?.week_start;
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      res.status(400).json({ ok: false, error: 'week_start (YYYY-MM-DD) is required' });
      return;
    }
    const stats = await assignWeekReviews(weekStart);
    res.json({ ok: true, ...stats });
  } catch (err) {
    logError('Error assigning themes', err);
    res.status(500).json({ ok: false, error: String((err as Error).message) });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
//  PULSE ROUTES
// ──────────────────────────────────────────────────────────────────────────────

/** POST /api/pulses/generate — generate weekly pulse for a given week */
app.post('/api/pulses/generate', async (req: Request, res: Response) => {
  try {
    const weekStart: string = req.body?.week_start;
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      res.status(400).json({ ok: false, error: 'week_start (YYYY-MM-DD) is required' });
      return;
    }
    const pulse = await generatePulse(weekStart);
    res.json({ ok: true, pulse });
  } catch (err) {
    logError('Error generating pulse', err);
    res.status(500).json({ ok: false, error: String((err as Error).message) });
  }
});

/** GET /api/pulses — list recent pulses */
app.get('/api/pulses', async (_req: Request, res: Response) => {
  try {
    const pulses = await listPulses(20);
    res.json({ ok: true, pulses });
  } catch (err: any) {
    logError('Error listing pulses', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to list pulses' });
  }
});

/** GET /api/pulses/:id — get a single pulse */
app.get('/api/pulses/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ ok: false, error: 'Invalid pulse id' });
      return;
    }
    const pulse = await getPulse(id);
    if (!pulse) {
      res.status(404).json({ ok: false, error: 'Pulse not found' });
      return;
    }
    res.json({ ok: true, pulse });
  } catch (err: any) {
    logError('Error getting pulse', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to get pulse' });
  }
});

/** POST /api/pulses/:id/send-email — email a pulse; body: { to? } */
app.post('/api/pulses/:id/send-email', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ ok: false, error: 'Invalid pulse id' });
      return;
    }
    const pulse = await getPulse(id);
    if (!pulse) {
      res.status(404).json({ ok: false, error: 'Pulse not found' });
      return;
    }

    // Use explicit `to` from body, fall back to active user preference email
    let to: string = req.body?.to;
    if (!to) {
      const prefs = await getUserPrefs();
      if (!prefs) {
        res.status(400).json({ ok: false, error: 'No recipient: provide `to` or save user preferences first' });
        return;
      }
      to = prefs.email;
    }

    await sendPulseEmail(to, pulse);
    res.json({ ok: true, message: `Pulse #${id} sent to ${to}` });
  } catch (err) {
    logError('Error sending pulse email', err);
    res.status(500).json({ ok: false, error: String((err as Error).message) });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
//  USER PREFERENCE ROUTES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/user-preferences
 * Body: { email, timezone, preferred_day_of_week, preferred_time }
 */
app.post('/api/user-preferences', async (req: Request, res: Response) => {
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

    const saved = await upsertUserPrefs({ email, timezone, preferred_day_of_week, preferred_time });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    res.json({
      ok: true,
      preferences: saved,
      confirmation: `You will receive your weekly pulse every ${dayNames[preferred_day_of_week]} at ${preferred_time} (${timezone}) to ${email}.`
    });
  } catch (err: any) {
    logError('Error saving user preferences', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to save preferences' });
  }
});

/** GET /api/user-preferences — get current active preferences */
app.get('/api/user-preferences', async (_req: Request, res: Response) => {
  try {
    const prefs = await getUserPrefs();
    if (!prefs) {
      res.status(404).json({ ok: false, error: 'No preferences configured yet' });
      return;
    }
    res.json({ ok: true, preferences: prefs });
  } catch (err: any) {
    logError('Error getting user preferences', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to get preferences' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
//  EMAIL TEST ROUTE
// ──────────────────────────────────────────────────────────────────────────────

/** POST /api/email/test — send a test email to verify SMTP setup */
app.post('/api/email/test', async (req: Request, res: Response) => {
  try {
    const to: string = req.body?.to;
    if (!to || !to.includes('@')) {
      res.status(400).json({ ok: false, error: 'Valid `to` email is required' });
      return;
    }
    await sendTestEmail(to);
    res.json({ ok: true, message: `Test email sent to ${to}` });
  } catch (err) {
    logError('Error sending test email', err);
    res.status(500).json({ ok: false, error: String((err as Error).message) });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
//  CONVENIENCE ROUTE
// ──────────────────────────────────────────────────────────────────────────────

/** GET /api/reviews/week/:weekStart — list a week's reviews (debug helper) */
app.get('/api/reviews/week/:weekStart', (req: Request, res: Response) => {
  try {
    const weekStart = req.params.weekStart;
    const reviews = listReviewsForWeek(weekStart);
    res.json({ ok: true, reviews });
  } catch (err) {
    logError('Error listing week reviews', err);
    res.status(500).json({ ok: false, error: 'Failed to list week reviews' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
//  Start server + scheduler
// ──────────────────────────────────────────────────────────────────────────────

const port = config.port;
app.listen(port, () => {
  logInfo(`Phase 2 API server running on port ${port}`, { databaseFile: config.databaseFile });
  // Start scheduler (every 5 minutes by default) only if GROQ_API_KEY is present
  if (config.groqApiKey) {
    startScheduler();
  } else {
    logInfo('Scheduler NOT started – set GROQ_API_KEY to enable automatic pulse delivery.');
  }
});

export { app };
