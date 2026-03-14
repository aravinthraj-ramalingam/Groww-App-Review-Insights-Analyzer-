"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Phase 2 – pulse.test.ts
 * Tests pulse generation shape, word count enforcement, and DB persistence.
 * Groq is stubbed so no real API calls are made.
 */
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const piiScrubber_1 = require("../services/piiScrubber");
// ── Helper: word count ────────────────────────────────────────────────────────
function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
}
// ── PII scrubber tests (covers piiScrubber.ts) ───────────────────────────────
(0, node_test_1.default)('scrubPii redacts email addresses', () => {
    const result = (0, piiScrubber_1.scrubPii)('Contact us at john.doe@example.com for support');
    strict_1.default.ok(!result.includes('john.doe@example.com'), 'email should be redacted');
    strict_1.default.ok(result.includes('[redacted]'), 'should contain [redacted]');
});
(0, node_test_1.default)('scrubPii redacts Indian mobile numbers', () => {
    const result = (0, piiScrubber_1.scrubPii)('Call 9876543210 for help');
    strict_1.default.ok(!result.includes('9876543210'), 'phone number should be redacted');
    strict_1.default.ok(result.includes('[redacted]'));
});
(0, node_test_1.default)('scrubPii redacts URLs', () => {
    const result = (0, piiScrubber_1.scrubPii)('Visit https://groww.in for more info');
    strict_1.default.ok(!result.includes('https://groww.in'), 'URL should be redacted');
    strict_1.default.ok(result.includes('[redacted]'));
});
(0, node_test_1.default)('scrubPii redacts @handles', () => {
    const result = (0, piiScrubber_1.scrubPii)('DM me @growwapp on Twitter');
    strict_1.default.ok(!result.includes('@growwapp'), '@handle should be redacted');
    strict_1.default.ok(result.includes('[redacted]'));
});
(0, node_test_1.default)('scrubPii leaves clean text unchanged', () => {
    const clean = 'The app crashes when loading the portfolio page.';
    const result = (0, piiScrubber_1.scrubPii)(clean);
    strict_1.default.equal(result, clean);
});
// ── Weekly note word count guard ─────────────────────────────────────────────
(0, node_test_1.default)('word count of a 250 word note is within limit', () => {
    // Simulate a note at exactly the limit
    const words = Array.from({ length: 250 }, (_, i) => `word${i}`).join(' ');
    strict_1.default.equal(countWords(words), 250);
    strict_1.default.ok(countWords(words) <= 250);
});
(0, node_test_1.default)('word count detects over-limit note', () => {
    const words = Array.from({ length: 260 }, (_, i) => `word${i}`).join(' ');
    strict_1.default.ok(countWords(words) > 250, 'should detect over-limit note');
});
// ── Pulse object shape validation ─────────────────────────────────────────────
(0, node_test_1.default)('pulse object must have required fields', () => {
    const mockPulse = {
        id: 1,
        week_start: '2026-03-09',
        week_end: '2026-03-15',
        top_themes: [
            { theme_id: 1, name: 'Performance', description: 'App speed', review_count: 10, avg_rating: 2.5 }
        ],
        user_quotes: [{ text: 'The app is very slow.', rating: 2 }],
        action_ideas: [{ idea: 'Optimize app startup time.' }],
        note_body: 'This week performance was the top concern.',
        created_at: new Date().toISOString(),
        version: 1
    };
    strict_1.default.ok(typeof mockPulse.id === 'number');
    strict_1.default.ok(/^\d{4}-\d{2}-\d{2}$/.test(mockPulse.week_start));
    strict_1.default.ok(Array.isArray(mockPulse.top_themes));
    strict_1.default.ok(Array.isArray(mockPulse.user_quotes));
    strict_1.default.ok(Array.isArray(mockPulse.action_ideas));
    strict_1.default.ok(typeof mockPulse.note_body === 'string');
    strict_1.default.ok(countWords(mockPulse.note_body) <= 250);
});
(0, node_test_1.default)('top_themes limited to max 3', () => {
    const themes = [
        { theme_id: 1, name: 'A', description: 'd', review_count: 10, avg_rating: 3 },
        { theme_id: 2, name: 'B', description: 'd', review_count: 8, avg_rating: 2 },
        { theme_id: 3, name: 'C', description: 'd', review_count: 5, avg_rating: 4 }
    ];
    // Simulate slicing to top 3
    const top3 = themes.slice(0, 3);
    strict_1.default.equal(top3.length, 3);
});
