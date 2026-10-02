import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  answerDidITake,
  decideTaken,
  newlyMissed,
  planReminders,
  slotStates,
  slotWindows,
} from './dose';
import { allTemplates, renderAnswer } from './templates';
import type { DoseEvent, Elder, Slot } from './types';
import { SLOTS } from './types';

const elder: Pick<Elder, 'times'> = {
  times: { wake: '06:30', breakfast: '08:00', lunch: '13:00', dinner: '19:30', sleep: '22:00' },
};
const ALL: Slot[] = [...SLOTS];
const at = (h: number, m = 0) => new Date(2026, 9, 2, h, m);
const DATE = '2026-10-02';
const taken = (slot: Slot, h: number, m = 0): DoseEvent => ({
  id: `t-${slot}`, date: DATE, slot, status: 'taken', source: 'button', at: at(h, m).toISOString(),
});
const ctx = { lang: 'en' as const, name: 'Ammi', family: 'Nimal' };

test('windows open 30 min early and close when the next one opens', () => {
  const w = slotWindows(elder, ALL);
  assert.deepEqual(w.map((x) => [x.slot, x.opensAt, x.closesAt]), [
    ['morning', 450, 750],
    ['noon', 750, 1140],
    ['evening', 1140, 1260],
    ['night', 1260, 1440],
  ]);
});

test('night slot is at least 1 hour after dinner and 30 min before sleep', () => {
  const night = slotWindows(elder, ALL).find((x) => x.slot === 'night')!;
  assert.equal(night.dueAt, 21 * 60 + 30);
});

test('statuses through the morning', () => {
  const s = (d: Date, ev: DoseEvent[] = []) => slotStates(d, elder, ALL, ev).find((x) => x.slot === 'morning')!.status;
  assert.equal(s(at(7, 0)), 'upcoming');
  assert.equal(s(at(7, 45)), 'due');
  assert.equal(s(at(8, 29)), 'due');
  assert.equal(s(at(8, 30)), 'late');
  assert.equal(s(at(12, 31)), 'missed');
  assert.equal(s(at(9, 0), [taken('morning', 8, 5)]), 'taken');
});

test('"Did I take it?" — taken', () => {
  const a = answerDidITake(at(9, 0), elder, ALL, [taken('morning', 8, 5)]);
  assert.equal(a.kind, 'taken');
  assert.equal(renderAnswer(ctx, a), 'Yes, Ammi. You took your morning medicine at 8:05. The next one is at lunch time.');
});

test('"Did I take it?" — not yet due (early morning)', () => {
  const a = answerDidITake(at(6, 0), elder, ALL, []);
  assert.equal(renderAnswer(ctx, a), 'Not yet. Your next medicine is at breakfast time, at about 8:00.');
});

test('"Did I take it?" — due now', () => {
  const a = answerDidITake(at(8, 10), elder, ALL, []);
  assert.equal(renderAnswer(ctx, a), 'It is time now. Your morning box is lit up.');
});

test('"Did I take it?" — late or unsure goes to family, never "take it"', () => {
  const late = answerDidITake(at(9, 0), elder, ALL, []);
  assert.deepEqual(late, { kind: 'ask_family', slot: 'morning', reason: 'late' });
  assert.equal(renderAnswer(ctx, late), 'Please wait. I will ask Nimal.');
  const unsure: DoseEvent = { id: 'u', date: DATE, slot: 'morning', status: 'unsure', source: 'button', at: at(8, 5).toISOString() };
  assert.equal(answerDidITake(at(8, 10), elder, ALL, [unsure]).kind, 'ask_family');
});

test('after the last slot, next is tomorrow', () => {
  const a = answerDidITake(at(23, 0), elder, ALL, [taken('night', 21, 40)]);
  assert.equal(renderAnswer(ctx, a), 'Yes, Ammi. You took your night medicine at 9:40. The next one is tomorrow at breakfast time.');
});

test('double-dose guard', () => {
  assert.deepEqual(decideTaken(at(8, 5), elder, ALL, []), { kind: 'log_taken', slot: 'morning', date: DATE });
  const d = decideTaken(at(9, 40), elder, ALL, [taken('morning', 8, 5)]);
  assert.equal(d.kind, 'already_taken');
  assert.equal(decideTaken(at(6, 0), elder, ALL, []).kind, 'nothing_open');
});

test('only active slots count', () => {
  const two: Slot[] = ['morning', 'night'];
  const a = answerDidITake(at(13, 0), elder, two, [taken('morning', 8, 5)]);
  // noon has no medicine, so the morning window lasts until night opens
  assert.equal(a.kind, 'taken');
  assert.equal(renderAnswer(ctx, a), 'Yes, Ammi. You took your morning medicine at 8:05. The next one is at bedtime.');
});

test('missed doses are found once', () => {
  assert.deepEqual(newlyMissed(at(13, 0), elder, ALL, [taken('morning', 8, 0)]), []);
  assert.deepEqual(newlyMissed(at(13, 31), elder, ALL, [taken('morning', 8, 0)]), ['noon']);
  const recorded: DoseEvent = { id: 'm', date: DATE, slot: 'noon', status: 'missed', source: 'button', at: null };
  assert.deepEqual(newlyMissed(at(13, 31), elder, ALL, [taken('morning', 8, 0), recorded]), []);
});

test('reminders: due, +10, +20, skip taken and past', () => {
  const r = planReminders(at(8, 5), elder, ['morning', 'noon'], [], 1);
  assert.deepEqual(r.map((x) => `${x.slot}+${x.repeat}@${x.at.getHours()}:${x.at.getMinutes()}`), [
    'morning+1@8:10', 'morning+2@8:20', 'noon+0@13:0', 'noon+1@13:10', 'noon+2@13:20',
  ]);
  assert.equal(planReminders(at(8, 5), elder, ['morning'], [taken('morning', 8, 1)], 1).length, 0);
});

test('no elder template tells them to take a pill or says wrong/missed', () => {
  const banned = [/take (another|one more|it now|your pill)/i, /\bwrong\b/i, /\bmissed\b/i, /\bdose\b/i, /\bmg\b/i];
  for (const t of allTemplates()) for (const b of banned) assert.ok(!b.test(t), `${t} matches ${b}`);
});
