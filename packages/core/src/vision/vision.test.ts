import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PillSpec } from '../types';
import { LOOKALIKE_DISTANCE, pillDistance } from './features';
import { analyzePillPhoto, detectMat } from './pipeline';
import { synthPhoto } from './synth';

const DEMO: Record<string, PillSpec> = {
  sugar: { shape: 'oblong', colorA: 'white', score: true, sizeMm: { length: 19, width: 9 } },
  pressure: { shape: 'round', colorA: 'pink', sizeMm: { length: 7, width: 7 } },
  cholesterol: { shape: 'oval', colorA: 'yellow', sizeMm: { length: 10, width: 6 } },
  heart: { shape: 'capsule', colorA: 'red', colorB: 'white', split: 'vertical', sizeMm: { length: 18, width: 6 } },
};

test('markers are found and the homography is accurate', () => {
  const img = synthPhoto(null, { rotateDeg: 8, tilt: 0.08, seed: 3 });
  const m = detectMat(img);
  assert.equal(m.markers, 4);
  assert.ok(m.error < 1.5, `reprojection error ${m.error}`);
});

for (const [name, spec] of Object.entries(DEMO)) {
  test(`demo pill "${name}": shape, colour, size`, () => {
    const img = synthPhoto(spec, { rotateDeg: -6, tilt: 0.06, pillAngleDeg: 25, light: [1.08, 1, 0.86], seed: 7 });
    const a = analyzePillPhoto(img);
    const f = a.features;
    assert.ok(f, `no features, warnings: ${a.warnings.join(',')}`);
    assert.equal(f.shape, spec.shape, JSON.stringify(f.measures));
    assert.equal(f.colorA, spec.colorA, `labA ${f.labA.map((v) => v.toFixed(0))}`);
    if (spec.split && spec.split !== 'none') {
      assert.equal(f.split, spec.split);
      assert.equal(f.colorB, spec.colorB);
    } else {
      assert.equal(f.split, 'none');
    }
    assert.equal(f.score, !!spec.score, 'score line');
    assert.ok(Math.abs(f.sizeMm!.length - spec.sizeMm!.length) <= 0.8, `length ${f.sizeMm!.length}`);
    assert.ok(Math.abs(f.sizeMm!.width - spec.sizeMm!.width) <= 0.8, `width ${f.sizeMm!.width}`);
    assert.ok(f.confidence >= 0.8);
  });
}

test('other shapes: diamond and triangle', () => {
  for (const shape of ['diamond', 'triangle'] as const) {
    const spec: PillSpec = { shape, colorA: 'blue', sizeMm: { length: 9, width: 9 } };
    const f = analyzePillPhoto(synthPhoto(spec, { seed: 11, rotateDeg: 3 })).features;
    assert.equal(f?.shape, shape, JSON.stringify(f?.measures));
  }
});

test('three markers are enough (a finger over one corner)', () => {
  const f = analyzePillPhoto(synthPhoto(DEMO.pressure!, { hideMarkers: [3], seed: 5 })).features;
  assert.equal(f?.markersFound, 3);
  assert.equal(f?.shape, 'round');
});

test('empty mat -> no_pill warning, no features', () => {
  const a = analyzePillPhoto(synthPhoto(null, { seed: 2 }));
  assert.equal(a.features, null);
  assert.ok(a.warnings.includes('no_pill'));
});

test('photo without the mat -> no_markers warning', () => {
  const a = analyzePillPhoto(synthPhoto(DEMO.pressure!, { hideMarkers: [0, 1, 2, 3], seed: 9 }));
  assert.ok(a.warnings.includes('no_markers'));
});

test('look-alike distance: same pill close, demo pills far apart', () => {
  assert.ok(pillDistance(DEMO.pressure!, DEMO.pressure!) < 0.01);
  const names = Object.keys(DEMO);
  for (const a of names) for (const b of names) {
    if (a < b) assert.ok(pillDistance(DEMO[a]!, DEMO[b]!) > LOOKALIKE_DISTANCE, `${a} vs ${b}`);
  }
  const similar: PillSpec = { shape: 'round', colorA: 'pink', sizeMm: { length: 7.5, width: 7.5 } };
  assert.ok(pillDistance(DEMO.pressure!, similar) < LOOKALIKE_DISTANCE);
});
