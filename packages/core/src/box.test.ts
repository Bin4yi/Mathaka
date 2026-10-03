import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boxCommandsFor, boxEventAction, formatCommand, parseEvent } from './box';
import type { SlotState } from './dose';

const st = (slot: SlotState['slot'], status: SlotState['status']): SlotState => ({
  slot,
  status,
  takenAt: null,
  window: { slot, dueAt: 0, opensAt: 0, closesAt: 0 },
});

test('protocol lines', () => {
  assert.equal(formatCommand({ type: 'LIGHT', slot: 'morning' }), 'LIGHT 1');
  assert.equal(formatCommand({ type: 'BLINK', slot: 'night' }), 'BLINK 4');
  assert.equal(formatCommand({ type: 'ALL_OFF' }), 'ALL_OFF');
  assert.deepEqual(parseEvent('PRESS 2\r\n'), { type: 'PRESS', slot: 'noon' });
  assert.deepEqual(parseEvent('LID 3 OPEN'), { type: 'LID', slot: 'evening', open: true });
  assert.deepEqual(parseEvent('HELLO mathaka-box v1'), { type: 'HELLO', version: 'v1' });
  for (const junk of ['', 'PRESS', 'PRESS 9', 'LID 1 AJAR', 'hello', 'PRESS x']) assert.equal(parseEvent(junk), null, junk);
});

test('the open slot lights up, blinks when late, everything off otherwise', () => {
  assert.deepEqual(boxCommandsFor([st('morning', 'due')], 'morning').map(formatCommand), ['ALL_OFF', 'LIGHT 1']);
  assert.deepEqual(boxCommandsFor([st('morning', 'late')], 'morning').map(formatCommand), ['ALL_OFF', 'BLINK 1']);
  assert.deepEqual(boxCommandsFor([], null).map(formatCommand), ['ALL_OFF']);
});

test('box presses: lit slot = taken, other slot = tell the family, lid close ignored', () => {
  assert.deepEqual(boxEventAction({ type: 'PRESS', slot: 'morning' }, 'morning'), { kind: 'taken', slot: 'morning' });
  assert.deepEqual(boxEventAction({ type: 'LID', slot: 'night', open: true }, 'morning'), { kind: 'wrong_slot', slot: 'night', open: 'morning' });
  assert.deepEqual(boxEventAction({ type: 'LID', slot: 'morning', open: false }, 'morning'), { kind: 'ignore' });
  assert.deepEqual(boxEventAction({ type: 'PRESS', slot: 'noon' }, null), { kind: 'wrong_slot', slot: 'noon', open: null });
});
