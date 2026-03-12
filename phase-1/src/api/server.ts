import express from 'express';
import { config } from '../config/env';
import { logInfo, logError } from '../core/logger';
import { scrapeAndStoreReviews, listReviews } from '../services/reviewService';

const app = express();
app.use(express.json());

app.post('/api/reviews/scrape', async (req, res) => {
  try {
    const maxReviews = typeof req.body?.maxReviews === 'number' ? req.body.maxReviews : undefined;
    logInfo('Received /api/reviews/scrape request', { maxReviews });
    const result = await scrapeAndStoreReviews(maxReviews);
    res.json({ ok: true, ...result });
  } catch (err) {
    logError('Error in /api/reviews/scrape', err);
    res.status(500).json({ ok: false, error: 'Failed to scrape reviews' });
  }
});

// Browser-friendly trigger (Postman Cloud Agent can't call localhost)
app.get('/api/reviews/scrape', async (req, res) => {
  try {
    const maxReviews = req.query.maxReviews ? Number(req.query.maxReviews) : undefined;
    logInfo('Received GET /api/reviews/scrape request', { maxReviews });
    const result = await scrapeAndStoreReviews(Number.isNaN(maxReviews as any) ? undefined : maxReviews);
    res.json({ ok: true, ...result });
  } catch (err) {
    logError('Error in GET /api/reviews/scrape', err);
    res.status(500).json({ ok: false, error: 'Failed to scrape reviews' });
  }
});

app.get('/api/reviews', (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const reviews = listReviews(Number.isNaN(limit) ? 100 : limit);
    res.json({ ok: true, reviews });
  } catch (err) {
    logError('Error in /api/reviews', err);
    res.status(500).json({ ok: false, error: 'Failed to list reviews' });
  }
});

const port = config.port;
app.listen(port, () => {
  logInfo(`Phase 1 API server running on port ${port}`);
});

