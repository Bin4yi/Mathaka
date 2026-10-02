import type { Elder, Slot } from './types';
import { SLOTS } from './types';

/** Local calendar date as "YYYY-MM-DD" (never UTC, the elder lives in local time). */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** "HH:MM" -> minutes after midnight. */
export function parseHm(hm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) throw new Error(`bad time "${hm}"`);
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatHm(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Date at a given local minute-of-day on the same calendar day as `day`. */
export function atMinutes(day: Date, minutes: number): Date {
  const r = new Date(day);
  r.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return r;
}

/**
 * When each slot is due, from the elder's own day (meals first, as elders think in meals).
 * morning = breakfast, noon = lunch, evening = dinner, night = 30 min before sleep.
 */
export function slotTimes(elder: Pick<Elder, 'times'>): Record<Slot, number> {
  const t = elder.times;
  return {
    morning: parseHm(t.breakfast),
    noon: parseHm(t.lunch),
    evening: parseHm(t.dinner),
    night: Math.max(parseHm(t.sleep) - 30, parseHm(t.dinner) + 60),
  };
}

export function slotIndex(slot: Slot): number {
  return SLOTS.indexOf(slot);
}
