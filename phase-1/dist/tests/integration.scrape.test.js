"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const playstoreScraper_1 = require("../scraper/playstoreScraper");
// Runs only when explicitly enabled:
//   RUN_INTEGRATION=1 npm test
(0, node_test_1.default)('integration: scrapes some Groww reviews from Play Store', { skip: process.env.RUN_INTEGRATION !== '1' }, async () => {
    const reviews = await (0, playstoreScraper_1.scrapeFilteredReviews)({ maxReviews: 50 });
    strict_1.default.ok(Array.isArray(reviews));
    strict_1.default.ok(reviews.length > 0);
    strict_1.default.ok(reviews[0].id);
});
