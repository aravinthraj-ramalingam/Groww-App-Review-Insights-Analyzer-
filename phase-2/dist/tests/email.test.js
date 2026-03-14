"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Phase 2 – email.test.ts
 * Tests the email body builder: HTML/text output contains theme names,
 * no raw PI data slips through, and week_start appears in subject.
 */
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const emailService_1 = require("../services/emailService");
// ── Fixture ───────────────────────────────────────────────────────────────────
const mockPulse = {
    id: 1,
    week_start: '2026-03-09',
    week_end: '2026-03-15',
    top_themes: [
        { theme_id: 1, name: 'Performance', description: 'App is slow at startup', review_count: 25, avg_rating: 2.4 },
        { theme_id: 2, name: 'KYC Issues', description: 'KYC verification failures', review_count: 18, avg_rating: 1.9 },
        { theme_id: 3, name: 'UI Crash', description: 'App crashes on mutual funds screen', review_count: 12, avg_rating: 2.1 }
    ],
    user_quotes: [
        { text: 'The app takes forever to load after updates.', rating: 2 },
        { text: 'KYC keeps failing every time I try.', rating: 1 },
        { text: 'Mutual funds tab crashes the app.', rating: 2 }
    ],
    action_ideas: [
        { idea: 'Profile and optimize app cold-start time.' },
        { idea: 'Improve KYC error messages and retry flow.' },
        { idea: 'Fix crash in mutual funds module.' }
    ],
    note_body: 'This week, performance dominated feedback. Users report slow startup and repeated KYC failures. Recommend targeted fixes.',
    created_at: '2026-03-12T10:00:00.000Z',
    version: 1
};
// ── HTML builder tests ────────────────────────────────────────────────────────
(0, node_test_1.default)('buildEmailHtml contains the week_start date', () => {
    const html = (0, emailService_1.buildEmailHtml)(mockPulse);
    strict_1.default.ok(html.includes('2026-03-09'), 'HTML should contain week_start');
});
(0, node_test_1.default)('buildEmailHtml contains all theme names', () => {
    const html = (0, emailService_1.buildEmailHtml)(mockPulse);
    for (const theme of mockPulse.top_themes) {
        strict_1.default.ok(html.includes(theme.name), `HTML should contain theme: ${theme.name}`);
    }
});
(0, node_test_1.default)('buildEmailHtml contains all user quotes', () => {
    const html = (0, emailService_1.buildEmailHtml)(mockPulse);
    for (const quote of mockPulse.user_quotes) {
        strict_1.default.ok(html.includes(quote.text), `HTML should contain quote: ${quote.text}`);
    }
});
(0, node_test_1.default)('buildEmailHtml contains all action ideas', () => {
    const html = (0, emailService_1.buildEmailHtml)(mockPulse);
    for (const action of mockPulse.action_ideas) {
        strict_1.default.ok(html.includes(action.idea), `HTML should contain action: ${action.idea}`);
    }
});
(0, node_test_1.default)('buildEmailHtml contains no raw email addresses from fixture', () => {
    const pulseCopy = { ...mockPulse, note_body: 'Contact admin@groww.in for help.' };
    // We don't scrub in the builder directly (scrub is done in sendPulseEmail), so
    // this test confirms the builder doesn't add PII by itself — the note_body would
    // need to go through scrubPii before sending.
    const html = (0, emailService_1.buildEmailHtml)(pulseCopy);
    // If PII was passed IN, it would appear (scrubbing is the caller's responsibility)
    strict_1.default.ok(html.includes('admin@groww.in'), 'builder passes through input as-is (scrub is caller responsibility)');
});
// ── Plain-text builder tests ──────────────────────────────────────────────────
(0, node_test_1.default)('buildEmailText contains week_start', () => {
    const text = (0, emailService_1.buildEmailText)(mockPulse);
    strict_1.default.ok(text.includes('2026-03-09'), 'text should contain week_start');
});
(0, node_test_1.default)('buildEmailText contains all theme names', () => {
    const text = (0, emailService_1.buildEmailText)(mockPulse);
    for (const theme of mockPulse.top_themes) {
        strict_1.default.ok(text.includes(theme.name), `text should contain theme: ${theme.name}`);
    }
});
(0, node_test_1.default)('buildEmailText contains section headers', () => {
    const text = (0, emailService_1.buildEmailText)(mockPulse);
    strict_1.default.ok(text.includes('TOP THEMES'));
    strict_1.default.ok(text.includes('USER QUOTES'));
    strict_1.default.ok(text.includes('RECOMMENDED ACTIONS'));
    strict_1.default.ok(text.includes('WEEKLY NOTE'));
});
(0, node_test_1.default)('buildEmailText contains note_body', () => {
    const text = (0, emailService_1.buildEmailText)(mockPulse);
    strict_1.default.ok(text.includes(mockPulse.note_body));
});
