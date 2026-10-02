import { atMinutes, dateKey, minutesOfDay, slotTimes } from './time';
import type { DoseEvent, Elder, Slot } from './types';
import { SLOTS } from './types';

/** A slot "opens" this many minutes before its time (box lights up, reminder can be early). */
export const OPEN_BEFORE_MIN = 30;
/** Gentle repeats after the due time. */
export const REPEAT_AFTER_MIN = [10, 20] as const;
/** After this, the family is told (no loud alarms for the elder). */
export const FAMILY_ALERT_AFTER_MIN = 30;

export type SlotWindow = {
  slot: Slot;
  dueAt: number; // minutes after midnight
  opensAt: number;
  closesAt: number; // when the next slot opens (or end of day)
};

/** Windows for the slots that have medicine, in time order. Only these slots exist for the elder. */
export function slotWindows(elder: Pick<Elder, 'times'>, activeSlots: Slot[]): SlotWindow[] {
  const times = slotTimes(elder);
  const list = SLOTS.filter((s) => activeSlots.includes(s))
    .map((slot) => ({ slot, dueAt: times[slot], opensAt: Math.max(0, times[slot] - OPEN_BEFORE_MIN), closesAt: 24 * 60 }))
    .sort((a, b) => a.dueAt - b.dueAt);
  for (let i = 0; i < list.length - 1; i++) list[i]!.closesAt = list[i + 1]!.opensAt;
  return list;
}

/** The window "now" is inside, or null before the first one opens. */
export function currentWindow(nowMin: number, windows: SlotWindow[]): SlotWindow | null {
  return windows.find((w) => nowMin >= w.opensAt && nowMin < w.closesAt) ?? null;
}

export type NextDose = { slot: Slot; dueAt: number; tomorrow: boolean };

/** The first window that opens after `afterMin` (today), else the first one tomorrow. */
export function nextDose(afterMin: number, windows: SlotWindow[]): NextDose | null {
  if (windows.length === 0) return null;
  const today = windows.find((w) => w.opensAt > afterMin);
  if (today) return { slot: today.slot, dueAt: today.dueAt, tomorrow: false };
  const first = windows[0]!;
  return { slot: first.slot, dueAt: first.dueAt, tomorrow: true };
}

export type SlotStatus = 'upcoming' | 'due' | 'late' | 'taken' | 'missed';
export type SlotState = { slot: Slot; status: SlotStatus; takenAt: string | null; window: SlotWindow };

export function takenToday(events: DoseEvent[], date: string, slot: Slot): DoseEvent | undefined {
  return events.find((e) => e.date === date && e.slot === slot && e.status === 'taken');
}

/**
 * Status of every active slot today.
 * due  = open and not taken, up to FAMILY_ALERT_AFTER_MIN after the time
 * late = still inside its window, family already told; elder can still confirm
 * missed = window closed without a "taken"
 */
export function slotStates(now: Date, elder: Pick<Elder, 'times'>, activeSlots: Slot[], events: DoseEvent[]): SlotState[] {
  const date = dateKey(now);
  const nowMin = minutesOfDay(now);
  return slotWindows(elder, activeSlots).map((w) => {
    const taken = takenToday(events, date, w.slot);
    let status: SlotStatus;
    if (taken) status = 'taken';
    else if (nowMin < w.opensAt) status = 'upcoming';
    else if (nowMin < w.dueAt + FAMILY_ALERT_AFTER_MIN) status = 'due';
    else if (nowMin < w.closesAt) status = 'late';
    else status = 'missed';
    return { slot: w.slot, status, takenAt: taken?.at ?? null, window: w };
  });
}

// ---------- "Did I take my medicine?" ----------

export type ElderAnswer =
  | { kind: 'taken'; slot: Slot; takenAt: string; next: NextDose | null }
  | { kind: 'not_yet'; next: NextDose | null }
  | { kind: 'due_now'; slot: Slot }
  | { kind: 'ask_family'; slot: Slot | null; reason: 'late' | 'missed' | 'unsure' };

/**
 * Answer only from the log. Never guesses, never says "take another one".
 * Anything unclear goes to a human ("Let me check with Nimal").
 */
export function answerDidITake(
  now: Date,
  elder: Pick<Elder, 'times'>,
  activeSlots: Slot[],
  events: DoseEvent[],
): ElderAnswer {
  const windows = slotWindows(elder, activeSlots);
  const nowMin = minutesOfDay(now);
  const cur = currentWindow(nowMin, windows);
  if (!cur) return { kind: 'not_yet', next: nextDose(nowMin, windows) };

  const state = slotStates(now, elder, activeSlots, events).find((s) => s.slot === cur.slot)!;
  // An "unsure" log for this slot today always goes to a human.
  const unsure = events.some((e) => e.date === dateKey(now) && e.slot === cur.slot && e.status === 'unsure');
  if (state.status === 'taken' && state.takenAt) {
    return { kind: 'taken', slot: cur.slot, takenAt: state.takenAt, next: nextDose(cur.opensAt, windows) };
  }
  if (unsure) return { kind: 'ask_family', slot: cur.slot, reason: 'unsure' };
  if (state.status === 'due') return { kind: 'due_now', slot: cur.slot };
  return { kind: 'ask_family', slot: cur.slot, reason: state.status === 'late' ? 'late' : 'missed' };
}

// ---------- "I took it" + double-dose guard ----------

export type TakeDecision =
  | { kind: 'log_taken'; slot: Slot; date: string }
  | { kind: 'already_taken'; slot: Slot; date: string; takenAt: string; next: NextDose | null }
  | { kind: 'nothing_open'; next: NextDose | null };

/** What to do when the elder says "I took it" now. The caller writes the events. */
export function decideTaken(
  now: Date,
  elder: Pick<Elder, 'times'>,
  activeSlots: Slot[],
  events: DoseEvent[],
): TakeDecision {
  const windows = slotWindows(elder, activeSlots);
  const nowMin = minutesOfDay(now);
  const date = dateKey(now);
  const cur = currentWindow(nowMin, windows);
  if (!cur) return { kind: 'nothing_open', next: nextDose(nowMin, windows) };
  const taken = takenToday(events, date, cur.slot);
  if (taken?.at) return { kind: 'already_taken', slot: cur.slot, date, takenAt: taken.at, next: nextDose(cur.opensAt, windows) };
  return { kind: 'log_taken', slot: cur.slot, date };
}

// ---------- missed doses + reminders ----------

/** Slots that passed the family-alert time today without "taken" and are not yet recorded as missed. */
export function newlyMissed(now: Date, elder: Pick<Elder, 'times'>, activeSlots: Slot[], events: DoseEvent[]): Slot[] {
  const date = dateKey(now);
  return slotStates(now, elder, activeSlots, events)
    .filter((s) => s.status === 'late' || s.status === 'missed')
    .filter((s) => !events.some((e) => e.date === date && e.slot === s.slot && e.status === 'missed'))
    .map((s) => s.slot);
}

export type PlannedReminder = { slot: Slot; at: Date; repeat: 0 | 1 | 2; date: string };

/** Reminder times (due, +10, +20) for `days` days from `now`, skipping the past and slots already taken. */
export function planReminders(
  now: Date,
  elder: Pick<Elder, 'times'>,
  activeSlots: Slot[],
  events: DoseEvent[],
  days = 2,
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  const windows = slotWindows(elder, activeSlots);
  for (let d = 0; d < days; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const date = dateKey(day);
    for (const w of windows) {
      if (takenToday(events, date, w.slot)) continue;
      const offsets = [0, ...REPEAT_AFTER_MIN];
      offsets.forEach((off, i) => {
        const at = atMinutes(day, w.dueAt + off);
        if (at.getTime() > now.getTime()) out.push({ slot: w.slot, at, repeat: i as 0 | 1 | 2, date });
      });
    }
  }
  return out;
}
