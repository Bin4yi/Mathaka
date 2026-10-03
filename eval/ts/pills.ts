/**
 * Pill matching eval on synthetic photos (real photos: eval/sets/pills/real/, added later).
 * Calibrate each known pill from 3 photos, then test with photos in other light/angle,
 * plus pills that were never calibrated (must be rejected as "new-looking").
 * Also: Baseline B (colour only = "embedding-like" single signal) vs attributes.
 * Run: npx tsx eval/ts/pills.ts eval/sets/pills/specs.json
 */
import fs from 'node:fs';
import {
  analyzePillPhoto,
  combinePhotos,
  matchPill,
  paletteLab,
  synthPhoto,
  deltaE,
  type PillFeatures,
  type PillLook,
  type PillSpec,
} from '../../packages/core/src';

type Spec = { id: string; spec: PillSpec; known: boolean };
const { pills, seedsCalib, seedsTest } = JSON.parse(fs.readFileSync(process.argv[2]!, 'utf8')) as {
  pills: Spec[];
  seedsCalib: number[];
  seedsTest: number[];
};

const shoot = (spec: PillSpec, seed: number, test: boolean) =>
  analyzePillPhoto(
    synthPhoto(spec, {
      width: 800,
      height: 600,
      seed,
      rotateDeg: test ? (seed % 2 ? 12 : -9) : 3 - seed,
      tilt: test ? 0.1 : 0.04,
      pillAngleDeg: seed * 37,
      light: test ? (seed % 2 ? [1.12, 1, 0.78] : [0.9, 0.98, 1.1]) : [1, 1, 1],
      noise: test ? 7 : 4,
    }),
  ).features;

const calibrated: { id: string; look: PillLook }[] = [];
for (const p of pills.filter((x) => x.known)) {
  const fs_ = seedsCalib.map((s) => shoot(p.spec, s, false)).filter((f): f is PillFeatures => !!f);
  const c = combinePhotos(fs_);
  if (c) calibrated.push({ id: p.id, look: c.look });
}

for (const p of pills) {
  for (const seed of seedsTest) {
    const t0 = performance.now();
    const f = shoot(p.spec, seed, true);
    const ms = performance.now() - t0;
    if (!f) {
      console.log(JSON.stringify({ pill: p.id, known: p.known, seed, pred: 'no_features', ms }));
      continue;
    }
    const look: PillLook = { ...f, colorB: f.colorB, split: f.split };
    const m = matchPill(look, calibrated);
    // Baseline B: one signal only (colour), nearest with the same distance budget
    const byColour = calibrated
      .map((c) => ({ id: c.id, d: deltaE(f.labA, c.look.labA ?? paletteLab(c.look.colorA)) }))
      .sort((a, b) => a.d - b.d)[0]!;
    const baseline = byColour.d < 12 ? byColour.id : 'unknown';
    console.log(
      JSON.stringify({
        pill: p.id,
        known: p.known,
        seed,
        pred: m.kind === 'match' ? m.id : m.kind,
        distance: Math.round(m.distance * 1000) / 1000,
        baseline_colour_only: baseline,
        ms: Math.round(ms),
      }),
    );
  }
}
