import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combinePhotos, findLookalikes, readFrequency } from './calibration';
import type { PillFeatures } from './vision/pipeline';

const feat = (over: Partial<PillFeatures>): PillFeatures => ({
  shape: 'round',
  colorA: 'pink',
  split: 'none',
  score: false,
  labA: [75, 25, 2],
  sizeMm: { length: 7, width: 7 },
  measures: { aspect: 1, circularity: 0.95, extent: 0.78, vertices: 12 },
  markersFound: 4,
  confidence: 1,
  warnings: [],
  ...over,
});

test('combine: majority shape/colour, median size, score on any side', () => {
  const c = combinePhotos([
    feat({ sizeMm: { length: 7.2, width: 7.1 } }),
    feat({ score: true, sizeMm: { length: 6.9, width: 6.8 } }),
    feat({ shape: 'oval', sizeMm: { length: 7.0, width: 6.9 } }),
  ])!;
  assert.equal(c.spec.shape, 'round');
  assert.equal(c.spec.score, true);
  assert.deepEqual(c.spec.sizeMm, { length: 7.0, width: 6.9 });
  assert.equal(c.agree, false);
  assert.ok(c.confidence < 1);
});

test('look-alikes: two small pink round tablets are flagged, different pills are not', () => {
  const pairs = findLookalikes([
    { id: 'a', medicineId: 'm1', spec: { shape: 'round', colorA: 'pink', sizeMm: { length: 7, width: 7 } } },
    { id: 'b', medicineId: 'm2', spec: { shape: 'round', colorA: 'pink', sizeMm: { length: 7.4, width: 7.4 } } },
    { id: 'c', medicineId: 'm3', spec: { shape: 'oblong', colorA: 'white', score: true, sizeMm: { length: 19, width: 9 } } },
  ]);
  assert.deepEqual(pairs.map((p) => [p.a, p.b]), [['a', 'b']]);
});

test('frequency notes from clinic books', () => {
  const cases: [string, string[], string][] = [
    ['1 bd pc', ['morning', 'evening'], 'after'],
    ['nocte', ['night'], 'any'],
    ['1-0-1', ['morning', 'evening'], 'any'],
    ['1-1-1-1', ['morning', 'noon', 'evening', 'night'], 'any'],
    ['½-0-0', ['morning'], 'any'],
    ['tds ac', ['morning', 'noon', 'evening'], 'before'],
    ['mane', ['morning'], 'any'],
    ['Once daily after food', ['morning'], 'after'],
  ];
  for (const [raw, slots, meal] of cases) {
    const r = readFrequency(raw);
    assert.deepEqual({ raw, slots: r.slots, meal: r.meal }, { raw, slots, meal });
  }
  assert.ok(readFrequency('as directed').confidence < 0.5);
});
