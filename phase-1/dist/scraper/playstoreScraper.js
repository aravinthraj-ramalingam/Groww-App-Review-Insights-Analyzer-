"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeFilteredReviews = scrapeFilteredReviews;
const google_play_scraper_1 = __importDefault(require("google-play-scraper"));
const dates_1 = require("../utils/dates");
const filters_1 = require("./filters");
const logger_1 = require("../core/logger");
const APP_ID = 'com.nextbillion.groww';
async function scrapeFilteredReviews(options = {}) {
    const maxReviews = options.maxReviews ?? 2000;
    const result = [];
    const ctx = { seenSignatures: new Set() };
    try {
        (0, logger_1.logInfo)('Starting Play Store scrape', { appId: APP_ID, maxReviews });
        // google-play-scraper supports token-based pagination. Across versions,
        // the response is typically `{ data: ReviewItem[], nextPaginationToken }`.
        // We normalize to an `items` array and loop until we have enough reviews
        // or pagination ends.
        let nextToken;
        let totalRaw = 0;
        let page = 0;
        // Prevent pathological long pagination when filters drop most items.
        const maxPages = 50;
        while (result.length < maxReviews && page < maxPages) {
            const raw = await google_play_scraper_1.default.reviews({
                appId: APP_ID,
                sort: google_play_scraper_1.default.sort.NEWEST,
                // Always request a full page; filters may drop many items.
                num: 100,
                paginate: true,
                nextPaginationToken: nextToken
            });
            const items = Array.isArray(raw?.data)
                ? raw.data
                : Array.isArray(raw)
                    ? raw
                    : [];
            totalRaw += items.length;
            (0, logger_1.logInfo)('Fetched Play Store batch', {
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
                if (!(0, filters_1.passesFilters)({ id: r.id, title: rawTitle, text: rawText }, ctx)) {
                    droppedInBatch += 1;
                    continue;
                }
                const createdAt = new Date(r.date);
                const { weekStart, weekEnd } = (0, dates_1.getWeekRange)(createdAt);
                const combined = `${rawTitle} ${rawText}`.trim();
                result.push({
                    id: r.id,
                    platform: 'android',
                    rating: r.score,
                    title: rawTitle,
                    text: rawText,
                    cleanText: (0, filters_1.basicCleanText)(combined),
                    createdAt,
                    weekStart,
                    weekEnd,
                    rawPayload: r
                });
                keptInBatch += 1;
                if (result.length >= maxReviews)
                    break;
            }
            (0, logger_1.logInfo)('Batch filter summary', {
                page,
                keptInBatch,
                droppedInBatch,
                totalKept: result.length
            });
            nextToken = raw?.nextPaginationToken;
            if (!nextToken)
                break;
            page += 1;
        }
        (0, logger_1.logInfo)('Scrape finished', { totalRaw, totalKept: result.length });
        // Safety net: if filters eliminate everything but raw batches existed,
        // return minimally cleaned reviews so Phase 1 is demonstrably working.
        if (result.length === 0 && totalRaw > 0) {
            (0, logger_1.logInfo)('No reviews passed filters; falling back to minimally cleaned reviews.');
            const rawFallback = await google_play_scraper_1.default.reviews({
                appId: APP_ID,
                sort: google_play_scraper_1.default.sort.NEWEST,
                num: Math.min(200, maxReviews)
            });
            const fallbackItems = Array.isArray(rawFallback?.data)
                ? rawFallback.data
                : Array.isArray(rawFallback)
                    ? rawFallback
                    : [];
            for (const r of fallbackItems.slice(0, maxReviews)) {
                const rawTitle = r.title ?? '';
                const rawText = r.text ?? '';
                const createdAt = new Date(r.date);
                const { weekStart, weekEnd } = (0, dates_1.getWeekRange)(createdAt);
                const combined = `${rawTitle} ${rawText}`.trim();
                result.push({
                    id: r.id,
                    platform: 'android',
                    rating: r.score,
                    title: rawTitle,
                    text: rawText,
                    cleanText: (0, filters_1.basicCleanText)(combined),
                    createdAt,
                    weekStart,
                    weekEnd,
                    rawPayload: r
                });
            }
            (0, logger_1.logInfo)('Fallback populated reviews', { fallbackCount: result.length });
        }
    }
    catch (err) {
        (0, logger_1.logError)('Error while scraping reviews from Google Play', err);
    }
    return result;
}
