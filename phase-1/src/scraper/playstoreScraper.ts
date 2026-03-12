import gplay from 'google-play-scraper';
import { Review } from '../domain/review.model';
import { getWeekRange } from '../utils/dates';
import { FilterContext, passesFilters, basicCleanText } from './filters';
import { logError, logInfo } from '../core/logger';

const APP_ID = 'com.nextbillion.groww';

interface ScrapeOptions {
  maxReviews?: number;
}

export async function scrapeFilteredReviews(options: ScrapeOptions = {}): Promise<Review[]> {
  const maxReviews = options.maxReviews ?? 2000;
  const result: Review[] = [];
  const ctx: FilterContext = { seenSignatures: new Set() };

  try {
    logInfo('Starting Play Store scrape', { appId: APP_ID, maxReviews });

    // google-play-scraper supports token-based pagination. Across versions,
    // the response is typically `{ data: ReviewItem[], nextPaginationToken }`.
    // We normalize to an `items` array and loop until we have enough reviews
    // or pagination ends.
    let nextToken: string | undefined;
    let totalRaw = 0;
    let page = 0;

    // Prevent pathological long pagination when filters drop most items.
    const maxPages = 50;

    while (result.length < maxReviews && page < maxPages) {
      const raw: any = await gplay.reviews({
        appId: APP_ID,
        sort: gplay.sort.NEWEST,
        // Always request a full page; filters may drop many items.
        num: 100,
        paginate: true,
        nextPaginationToken: nextToken
      });

      const items: any[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
          ? raw
          : [];

      totalRaw += items.length;

      logInfo('Fetched Play Store batch', {
        page,
        batchCount: items.length,
        totalRaw,
        hasNextToken: Boolean(raw?.nextPaginationToken)
      });

      if (!items.length) {
        break;
      }

      let keptInBatch = 0;
      let droppedInBatch = 0;

      for (const r of items) {
        const rawTitle = r.title ?? '';
        const rawText = r.text ?? '';

        if (!passesFilters({ id: r.id, title: rawTitle, text: rawText }, ctx)) {
          droppedInBatch += 1;
          continue;
        }

        const createdAt = new Date(r.date);
        const { weekStart, weekEnd } = getWeekRange(createdAt);
        const combined = `${rawTitle} ${rawText}`.trim();

        result.push({
          id: r.id,
          platform: 'android',
          rating: r.score,
          title: rawTitle,
          text: rawText,
          cleanText: basicCleanText(combined),
          createdAt,
          weekStart,
          weekEnd,
          rawPayload: r
        });
        keptInBatch += 1;

        if (result.length >= maxReviews) break;
      }

      logInfo('Batch filter summary', {
        page,
        keptInBatch,
        droppedInBatch,
        totalKept: result.length
      });

      nextToken = raw?.nextPaginationToken;
      if (!nextToken) break;
      page += 1;
    }

    logInfo('Scrape finished', { totalRaw, totalKept: result.length });

    // Safety net: if filters eliminate everything but raw batches existed,
    // return minimally cleaned reviews so Phase 1 is demonstrably working.
    if (result.length === 0 && totalRaw > 0) {
      logInfo('No reviews passed filters; falling back to minimally cleaned reviews.');
      const rawFallback: any = await gplay.reviews({
        appId: APP_ID,
        sort: gplay.sort.NEWEST,
        num: Math.min(200, maxReviews)
      });

      const fallbackItems: any[] = Array.isArray(rawFallback?.data)
        ? rawFallback.data
        : Array.isArray(rawFallback)
          ? rawFallback
          : [];

      for (const r of fallbackItems.slice(0, maxReviews)) {
        const rawTitle = r.title ?? '';
        const rawText = r.text ?? '';
        const createdAt = new Date(r.date);
        const { weekStart, weekEnd } = getWeekRange(createdAt);
        const combined = `${rawTitle} ${rawText}`.trim();

        result.push({
          id: r.id,
          platform: 'android',
          rating: r.score,
          title: rawTitle,
          text: rawText,
          cleanText: basicCleanText(combined),
          createdAt,
          weekStart,
          weekEnd,
          rawPayload: r
        });
      }
      logInfo('Fallback populated reviews', { fallbackCount: result.length });
    }
  } catch (err) {
    logError('Error while scraping reviews from Google Play', err);
  }

  return result;
}

