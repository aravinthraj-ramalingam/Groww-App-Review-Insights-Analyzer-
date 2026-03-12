import test from 'node:test';
import assert from 'node:assert/strict';
import { basicCleanText, passesFilters } from '../scraper/filters';

test('basicCleanText redacts emails and phone numbers', () => {
  const input = 'Contact me at test@example.com or +91 9876543210';
  const out = basicCleanText(input);
  assert.ok(!out.includes('test@example.com'));
  assert.ok(!out.includes('9876543210'));
  assert.match(out, /\[redacted\]/);
});

test('passesFilters drops short reviews (<=7 words)', () => {
  const ctx = { seenSignatures: new Set<string>() };
  const ok = passesFilters({ id: '1', title: '', text: 'Too short review here' }, ctx);
  assert.equal(ok, false);
});

test('passesFilters drops duplicates', () => {
  const ctx = { seenSignatures: new Set<string>() };
  const r1 = passesFilters({ id: '1', title: 'Hello', text: 'This is a longer unique review text' }, ctx);
  const r2 = passesFilters({ id: '2', title: 'Hello', text: 'This is a longer unique review text' }, ctx);
  assert.equal(r1, true);
  assert.equal(r2, false);
});

