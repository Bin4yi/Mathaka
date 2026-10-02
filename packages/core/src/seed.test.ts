import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoData } from './seed';
import { PILL_COLORS, SLOTS } from './types';
import { dateKey } from './time';

const NOW = new Date(2026, 9, 2, 7, 30); // 2 Oct 2026, 07:30 local

test('demo seed is deterministic', () => {
  assert.deepEqual(buildDemoData(NOW), buildDemoData(NOW));
});

test('demo seed has 7 days of history and nothing today', () => {
  const d = buildDemoData(NOW);
  const dates = new Set(d.doseEvents.map((e) => e.date));
  assert.equal(dates.size, 7);
  assert.ok(!dates.has(dateKey(NOW)));
  const main = d.doseEvents.filter((e) => e.status !== 'prevented_double');
  assert.equal(main.length, 7 * SLOTS.length);
  assert.equal(d.doseEvents.filter((e) => e.status === 'missed').length, 3);
  assert.equal(d.doseEvents.filter((e) => e.status === 'prevented_double').length, 1);
});

test('every slot has at least one medicine and every pill colour is in the palette', () => {
  const d = buildDemoData(NOW);
  for (const s of SLOTS) assert.ok(d.schedule.some((x) => x.slot === s), s);
  for (const p of d.pillProfiles) {
    assert.ok(p.spec.colorA in PILL_COLORS);
    if (p.spec.colorB) assert.ok(p.spec.colorB in PILL_COLORS);
  }
});

test('taken doses have a time, missed ones do not', () => {
  for (const e of buildDemoData(NOW).doseEvents) {
    if (e.status === 'missed') assert.equal(e.at, null);
    else assert.ok(e.at);
  }
});
