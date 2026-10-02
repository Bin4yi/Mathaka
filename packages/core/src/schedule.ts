import type { DoseEvent, Medicine, PillProfile, ScheduleItem, Slot } from './types';
import { SLOTS } from './types';

export type SlotPill = {
  item: ScheduleItem;
  medicine: Medicine;
  profile?: PillProfile;
};

/** Pills for each slot, in a stable order (same order every day helps memory). */
export function pillsBySlot(
  schedule: ScheduleItem[],
  medicines: Medicine[],
  profiles: PillProfile[],
): Record<Slot, SlotPill[]> {
  const med = new Map(medicines.map((m) => [m.id, m]));
  // newest calibrated version wins
  const prof = new Map<string, PillProfile>();
  for (const p of profiles) {
    const old = prof.get(p.medicineId);
    if (!old || p.version > old.version) prof.set(p.medicineId, p);
  }
  const out = Object.fromEntries(SLOTS.map((s) => [s, [] as SlotPill[]])) as Record<Slot, SlotPill[]>;
  for (const item of schedule) {
    const medicine = med.get(item.medicineId);
    if (!medicine) continue;
    out[item.slot].push({ item, medicine, profile: prof.get(item.medicineId) });
  }
  for (const s of SLOTS) out[s].sort((a, b) => a.item.id.localeCompare(b.item.id));
  return out;
}

/** The "taken" event for this slot on this date, if any. */
export function takenEvent(events: DoseEvent[], date: string, slot: Slot): DoseEvent | undefined {
  return events.find((e) => e.date === date && e.slot === slot && e.status === 'taken');
}
