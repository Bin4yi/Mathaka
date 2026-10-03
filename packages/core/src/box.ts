import type { SlotState } from './dose';
import type { Slot } from './types';
import { SLOTS } from './types';

// The optional pill box (ESP32 + 4 LEDs + 4 buttons or lid switches, Arduino sketch in
// firmware/esp32/mathaka_box). Same text protocol over BLE and over USB serial.
// Slot numbers on the box: 1 morning, 2 noon, 3 evening, 4 night.

export const BOX = {
  name: 'mathaka-box',
  service: '6e1a0001-6d61-7468-616b-612d626f7821',
  /** phone -> box (write) */
  command: '6e1a0002-6d61-7468-616b-612d626f7821',
  /** box -> phone (notify) */
  event: '6e1a0003-6d61-7468-616b-612d626f7821',
} as const;

export type BoxCommand =
  | { type: 'LIGHT'; slot: Slot }
  | { type: 'BLINK'; slot: Slot }
  | { type: 'OFF'; slot: Slot }
  | { type: 'ALL_OFF' };

export type BoxEvent =
  | { type: 'PRESS'; slot: Slot }
  | { type: 'LID'; slot: Slot; open: boolean }
  | { type: 'HELLO'; version: string };

export const slotNumber = (s: Slot) => SLOTS.indexOf(s) + 1;
const slotFrom = (n: string): Slot | null => SLOTS[Number(n) - 1] ?? null;

export function formatCommand(c: BoxCommand): string {
  return c.type === 'ALL_OFF' ? 'ALL_OFF' : `${c.type} ${slotNumber(c.slot)}`;
}

/** Parse one line from the box. Unknown or broken lines -> null (never throw on radio noise). */
export function parseEvent(line: string): BoxEvent | null {
  const p = line.trim().split(/\s+/);
  if (p[0] === 'PRESS' && p.length === 2) {
    const slot = slotFrom(p[1]!);
    return slot ? { type: 'PRESS', slot } : null;
  }
  if (p[0] === 'LID' && p.length === 3 && (p[2] === 'OPEN' || p[2] === 'CLOSE')) {
    const slot = slotFrom(p[1]!);
    return slot ? { type: 'LID', slot, open: p[2] === 'OPEN' } : null;
  }
  if (p[0] === 'HELLO' && p[1] === 'mathaka-box') return { type: 'HELLO', version: p[2] ?? '?' };
  return null;
}

/**
 * What the box should show now: the open slot lit (blinking when late), everything else dark.
 * API note: a lock per slot can be added later as one more command, without changing this.
 */
export function boxCommandsFor(states: SlotState[], open: Slot | null): BoxCommand[] {
  if (!open) return [{ type: 'ALL_OFF' }];
  const late = states.find((s) => s.slot === open)?.status === 'late';
  return [{ type: 'ALL_OFF' }, late ? { type: 'BLINK', slot: open } : { type: 'LIGHT', slot: open }];
}

export type BoxAction = { kind: 'taken'; slot: Slot } | { kind: 'wrong_slot'; slot: Slot; open: Slot | null } | { kind: 'ignore' };

/**
 * A press or lid-open on the box. `current` = the slot whose time window we are in now,
 * taken or not. That slot = "I took it" (the app's double-dose guard then stops a second
 * dose). Another slot = the family is told (never a scary message for the elder).
 */
export function boxEventAction(e: BoxEvent, current: Slot | null): BoxAction {
  if (e.type === 'HELLO' || (e.type === 'LID' && !e.open)) return { kind: 'ignore' };
  if (current && e.slot === current) return { kind: 'taken', slot: e.slot };
  return { kind: 'wrong_slot', slot: e.slot, open: current };
}
