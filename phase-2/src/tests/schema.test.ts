import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

test('zod works in phase-2', () => {
  const S = z.object({ ok: z.boolean() });
  assert.deepEqual(S.parse({ ok: true }), { ok: true });
});

