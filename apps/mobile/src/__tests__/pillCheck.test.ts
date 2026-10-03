import { analyzePillPhoto, synthPhoto, type PillSpec } from '@mathaka/core';
import { getRepository, resetDemoData } from '../db/bootstrap';
import { demoClock } from '../services/clock';
import { checkShownPill } from '../services/pillCheck';

const photo = (spec: PillSpec, seed: number) =>
  analyzePillPhoto(synthPhoto(spec, { width: 640, height: 480, seed, rotateDeg: 7, tilt: 0.06, pillAngleDeg: 30 })).features;

beforeEach(async () => {
  await resetDemoData();
  demoClock.jumpTo(8, 10);
});

test('the morning sugar pill is recognised', async () => {
  const f = photo({ shape: 'oblong', colorA: 'white', score: true, sizeMm: { length: 19, width: 9 } }, 31);
  const out = await checkShownPill(f, 'morning');
  expect(out.result).toBe('match');
  expect(out.message.text).toMatch(/සීනි බෙහෙත/); // Sinhala elder: "sugar medicine"
});

test('a new-looking pill asks the family, never says "wrong"', async () => {
  const f = photo({ shape: 'diamond', colorA: 'blue', sizeMm: { length: 9, width: 9 } }, 32);
  const out = await checkShownPill(f, 'morning');
  expect(out.result).toBe('new_pill');
  expect(out.message.tone).toBe('ask_family');
  const alerts = await (await getRepository()).listAlerts();
  expect(alerts.some((a) => a.kind === 'new_pill')).toBe(true);
});

test('the night pill shown in the morning goes to a human', async () => {
  const f = photo({ shape: 'oval', colorA: 'yellow', sizeMm: { length: 10, width: 6 } }, 33);
  const out = await checkShownPill(f, 'morning');
  expect(out.result).toBe('other_slot');
  expect(out.message.tone).toBe('ask_family');
});
