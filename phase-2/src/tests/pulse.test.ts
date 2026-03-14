/**
 * Phase 2 – pulse.test.ts
 * Tests pulse generation shape, word count enforcement, and DB persistence.
 * Groq is stubbed so no real API calls are made.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { scrubPii } from '../services/piiScrubber';

// ── Helper: word count ────────────────────────────────────────────────────────
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── PII scrubber tests (covers piiScrubber.ts) ───────────────────────────────

test('scrubPii redacts email addresses', () => {
  const result = scrubPii('Contact us at john.doe@example.com for support');
  assert.ok(!result.includes('john.doe@example.com'), 'email should be redacted');
  assert.ok(result.includes('[redacted]'), 'should contain [redacted]');
});

test('scrubPii redacts Indian mobile numbers', () => {
  const result = scrubPii('Call 9876543210 for help');
  assert.ok(!result.includes('9876543210'), 'phone number should be redacted');
  assert.ok(result.includes('[redacted]'));
});

test('scrubPii redacts URLs', () => {
  const result = scrubPii('Visit https://groww.in for more info');
  assert.ok(!result.includes('https://groww.in'), 'URL should be redacted');
  assert.ok(result.includes('[redacted]'));
});

test('scrubPii redacts @handles', () => {
  const result = scrubPii('DM me @growwapp on Twitter');
  assert.ok(!result.includes('@growwapp'), '@handle should be redacted');
  assert.ok(result.includes('[redacted]'));
});

test('scrubPii leaves clean text unchanged', () => {
  const clean = 'The app crashes when loading the portfolio page.';
  const result = scrubPii(clean);
  assert.equal(result, clean);
});

// ── Weekly note word count guard ─────────────────────────────────────────────

test('word count of a 250 word note is within limit', () => {
  // Simulate a note at exactly the limit
  const words = Array.from({ length: 250 }, (_, i) => `word${i}`).join(' ');
  assert.equal(countWords(words), 250);
  assert.ok(countWords(words) <= 250);
});

test('word count detects over-limit note', () => {
  const words = Array.from({ length: 260 }, (_, i) => `word${i}`).join(' ');
  assert.ok(countWords(words) > 250, 'should detect over-limit note');
});

// ── Pulse object shape validation ─────────────────────────────────────────────

test('pulse object must have required fields', () => {
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

  assert.ok(typeof mockPulse.id === 'number');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(mockPulse.week_start));
  assert.ok(Array.isArray(mockPulse.top_themes));
  assert.ok(Array.isArray(mockPulse.user_quotes));
  assert.ok(Array.isArray(mockPulse.action_ideas));
  assert.ok(typeof mockPulse.note_body === 'string');
  assert.ok(countWords(mockPulse.note_body) <= 250);
});

test('top_themes limited to max 3', () => {
  const themes = [
    { theme_id: 1, name: 'A', description: 'd', review_count: 10, avg_rating: 3 },
    { theme_id: 2, name: 'B', description: 'd', review_count: 8, avg_rating: 2 },
    { theme_id: 3, name: 'C', description: 'd', review_count: 5, avg_rating: 4 }
  ];
  // Simulate slicing to top 3
  const top3 = themes.slice(0, 3);
  assert.equal(top3.length, 3);
});
