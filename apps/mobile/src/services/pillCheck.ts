import { dateKey, elderText, matchPill, type PillFeatures, type Slot } from '@mathaka/core';
import { getRepository } from '../db/bootstrap';
import type { ElderMessage } from '../store/appStore';
import { currentProfiles } from './calibrationService';
import { loadElderView, raiseAlert } from './doseService';

// "Check my pill": the elder shows ONE pill on the mat. A helper only, never the main ID
// (the schedule + box slot are). It can only say "yes, this is your X" or ask a human.

export type CheckOutcome = { message: ElderMessage; result: 'match' | 'other_slot' | 'unsure' | 'new_pill' | 'no_pill' };

export async function checkShownPill(f: PillFeatures | null, slot: Slot | null): Promise<CheckOutcome> {
  const view = await loadElderView();
  if (!view) return { message: { text: '', tone: 'calm' }, result: 'no_pill' };
  const ask: ElderMessage = { text: elderText(view.ctx, 'answer.askFamily'), tone: 'ask_family' };
  if (!f) return { message: { text: elderText(view.ctx, 'check.tip'), tone: 'calm' }, result: 'no_pill' };

  const repo = await getRepository();
  const profiles = await currentProfiles();
  const medicines = await repo.listMedicines();
  const r = matchPill(f, profiles.map((p) => ({ id: p.id, look: p.spec })));
  const date = dateKey(view.now);

  if (r.kind === 'unknown') {
    await raiseAlert(repo, 'new_pill', date, slot, { distance: Math.round(r.distance * 100) / 100 });
    return { message: ask, result: 'new_pill' };
  }
  if (r.kind === 'unsure') {
    await raiseAlert(repo, 'unsure_check', date, slot, { reason: 'unsure' });
    return { message: ask, result: 'unsure' };
  }
  const profile = profiles.find((p) => p.id === r.id)!;
  const inSlot = slot ? view.bySlot[slot].some((p) => p.medicine.id === profile.medicineId) : false;
  if (!inSlot) {
    await raiseAlert(repo, 'unsure_check', date, slot, { reason: 'other_slot' });
    return { message: ask, result: 'other_slot' };
  }
  const med = medicines.find((m) => m.id === profile.medicineId)!;
  return { message: { text: elderText(view.ctx, 'check.match', { purpose: med.purpose[view.ctx.lang] }), tone: 'done' }, result: 'match' };
}
