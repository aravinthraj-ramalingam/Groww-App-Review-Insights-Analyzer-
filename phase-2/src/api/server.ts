import express from 'express';
import { config } from '../config/env';
import { initSchema } from '../db';
import { logError, logInfo } from '../core/logger';
import { listRecentReviews, listReviewsForWeek } from '../services/reviewsRepo';
import { generateThemesFromReviews, listLatestThemes, upsertThemes } from '../services/themeService';

initSchema();

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

// Phase 2: generate 3-5 themes using Groq and persist them
app.post('/api/themes/generate', async (req, res) => {
  try {
    const weeksBack = typeof req.body?.weeksBack === 'number' ? req.body.weeksBack : 12;
    const limit = typeof req.body?.limit === 'number' ? req.body.limit : 800;
    const reviews = listRecentReviews(weeksBack, limit);
    logInfo('Generating themes', { weeksBack, limit, reviewCount: reviews.length });

    const themes = await generateThemesFromReviews(reviews);
    const ids = upsertThemes(themes);
    res.json({ ok: true, themes: themes.map((t, i) => ({ id: ids[i], ...t })) });
  } catch (err) {
    logError('Error generating themes', err);
    res.status(500).json({ ok: false, error: 'Failed to generate themes' });
  }
});

app.get('/api/themes', (_req, res) => {
  try {
    const themes = listLatestThemes(5);
    res.json({ ok: true, themes });
  } catch (err) {
    logError('Error listing themes', err);
    res.status(500).json({ ok: false, error: 'Failed to list themes' });
  }
});

// Convenience: list a week’s reviews (for debugging)
app.get('/api/reviews/week/:weekStart', (req, res) => {
  try {
    const weekStart = req.params.weekStart;
    const reviews = listReviewsForWeek(weekStart);
    res.json({ ok: true, reviews });
  } catch (err) {
    logError('Error listing week reviews', err);
    res.status(500).json({ ok: false, error: 'Failed to list week reviews' });
  }
});

const port = config.port;
app.listen(port, () => {
  logInfo(`Phase 2 API server running on port ${port}`, { databaseFile: config.databaseFile });
});

