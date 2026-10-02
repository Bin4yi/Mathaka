import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PrescriptionDraftSchema, checkOptions, toDecision } from './ai';

test('toDecision normalises and picks the top label', () => {
  const d = toDecision({ yes: 2, no: 1, unsure: 1 });
  assert.equal(d.label, 'yes');
  assert.equal(d.confidence, 0.5);
});

test('option lists must stay under 20', () => {
  assert.throws(() => checkOptions(['a']));
  assert.throws(() => checkOptions(Array.from({ length: 20 }, (_, i) => `o${i}`)));
  checkOptions(['a', 'b']);
});

test('prescription schema fills defaults and rejects bad slots', () => {
  const ok = PrescriptionDraftSchema.parse({ rows: [{ name: 'Metformin', confidence: 0.8 }] });
  assert.equal(ok.rows[0]!.dose_count, 1);
  assert.equal(ok.rows[0]!.meal, 'any');
  assert.throws(() =>
    PrescriptionDraftSchema.parse({ rows: [{ name: 'x', times: ['lunchtime'], confidence: 1 }] }),
  );
});
