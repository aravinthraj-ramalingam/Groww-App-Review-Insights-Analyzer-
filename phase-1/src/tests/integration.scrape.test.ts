import test from 'node:test';
import assert from 'node:assert/strict';
import { scrapeFilteredReviews } from '../scraper/playstoreScraper';

// Runs only when explicitly enabled:
//   RUN_INTEGRATION=1 npm test
test('integration: scrapes some Groww reviews from Play Store', { skip: process.env.RUN_INTEGRATION !== '1' }, async () => {
  const reviews = await scrapeFilteredReviews({ maxReviews: 50 });
  assert.ok(Array.isArray(reviews));
  assert.ok(reviews.length > 0);
  assert.ok(reviews[0].id);
});

