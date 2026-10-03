import {
  answerDidITake,
  boxCommandsFor,
  boxEventAction,
  type BoxEvent,
  dateKey,
  decideTaken,
  elderText,
  isoClock,
  minutesOfDay,
  newlyMissed,
  nextText,
  pillsBySlot,
  renderAnswer,
  SLOT_WORD,
  slotStates,
  type DoseEvent,
  type Elder,
  type ElderContext,
  type Person,
  type Slot,
  type SlotPill,
  type SlotState,
} from '@mathaka/core';
import { getRepository } from '../db/bootstrap';
import type { Repository } from '../db/repository';
import { useAppStore, type ElderMessage } from '../store/appStore';
import { clock } from './clock';
import { newId } from './ids';
import { deliverAlert, pushLogToFamily } from './linkService';
import { sendBox } from './boxService';
import { rescheduleReminders } from './notifications';

export type ElderView = {
  now: Date;
  elder: Elder;
  family: Person | null;
  ctx: ElderContext;
  active: Slot[];
  bySlot: Record<Slot, SlotPill[]>;
  states: SlotState[];
  /** The slot that is open now and not yet taken (due or late), if any. */
  open: SlotState | null;
  events: DoseEvent[];
};

/** First family member is who the elder hears about ("I will ask Nimal"). */
function mainFamily(people: Person[]): Person | null {
  return people.find((p) => p.role === 'family') ?? people[0] ?? null;
}

export async function loadElderView(repo?: Repository): Promise<ElderView | null> {
  const r = repo ?? (await getRepository());
  const now = clock.now();
  const today = dateKey(now);
  const [elder, people, schedule, medicines, profiles, events] = await Promise.all([
    r.getElder(),
    r.listPeople(),
    r.listSchedule(),
    r.listMedicines(),
    r.listPillProfiles(),
    r.listDoseEvents(today, today),
  ]);
  if (!elder) return null;
  const bySlot = pillsBySlot(schedule, medicines, profiles);
  const active = (Object.keys(bySlot) as Slot[]).filter((s) => bySlot[s].length > 0);
  const states = slotStates(now, elder, active, events);
  const family = mainFamily(people);
  return {
    now,
    elder,
    family,
    ctx: { lang: elder.language, name: elder.preferredName, family: family?.name ?? '' },
    active,
    bySlot,
    states,
    open: states.find((s) => s.status === 'due' || s.status === 'late') ?? null,
    events,
  };
}

async function afterChange(repo: Repository): Promise<void> {
  useAppStore.getState().bumpData();
  const view = await loadElderView(repo);
  if (view) await rescheduleReminders(view);
  void pushLogToFamily();
}

/** Family alert, once per (kind, date, slot). */
export async function raiseAlert(
  repo: Repository,
  kind: 'missed' | 'unsure_answer' | 'unsure_check' | 'new_pill',
  date: string,
  slot: Slot | null,
  data?: Record<string, string | number>,
) {
  const id = `al-${kind}-${date}-${slot ?? 'x'}`;
  const existing = (await repo.listAlerts()).find((a) => a.id === id);
  if (existing) return;
  const alert = { id, kind, date, slot: slot ?? undefined, createdAt: clock.now().toISOString(), readAt: null, data };
  await repo.saveAlert(alert);
  // tell the family: Wi-Fi link first, SMS if that fails (never blocks the elder screen)
  void deliverAlert(alert);
}

/** The elder confirmed "I took it" (after the confirm step). Double-dose guard lives in core. */
export async function confirmTaken(source: DoseEvent['source'] = 'button'): Promise<ElderMessage> {
  const repo = await getRepository();
  const view = await loadElderView(repo);
  if (!view) return { text: '', tone: 'calm' };
  const now = clock.now();
  const d = decideTaken(now, view.elder, view.active, view.events);
  const slotWord = (s: Slot) => SLOT_WORD[view.ctx.lang][s];

  if (d.kind === 'nothing_open') {
    return { text: elderText(view.ctx, 'answer.notNow', { next: nextText(view.ctx.lang, d.next) }), tone: 'calm' };
  }
  if (d.kind === 'already_taken') {
    await repo.saveDoseEvent({ id: newId('de'), date: d.date, slot: d.slot, status: 'prevented_double', source, at: now.toISOString() });
    await repo.addAudit({ id: newId('au'), at: now.toISOString(), actor: 'elder', action: 'double_dose_prevented', details: d.slot });
    await afterChange(repo);
    return {
      text: elderText(view.ctx, 'answer.already', {
        slot: slotWord(d.slot),
        time: isoClock(d.takenAt),
        next: nextText(view.ctx.lang, d.next),
      }),
      tone: 'calm',
    };
  }

  await repo.saveDoseEvent({ id: newId('de'), date: d.date, slot: d.slot, status: 'taken', source, at: now.toISOString() });
  // pill counts (refill alerts come in M9)
  const meds = await repo.listMedicines();
  for (const p of view.bySlot[d.slot]) {
    const m = meds.find((x) => x.id === p.medicine.id);
    if (m) await repo.saveMedicine({ ...m, remainingCount: Math.max(0, m.remainingCount - p.item.count) });
  }
  await repo.addAudit({ id: newId('au'), at: now.toISOString(), actor: 'elder', action: 'dose_taken', details: `${d.slot} via ${source}` });
  await afterChange(repo);
  return { text: elderText(view.ctx, 'answer.logged'), tone: 'done' };
}

/** "Did I take my medicine?" — answered only from the log, by template. */
export async function askDidITake(via: 'button' | 'voice' = 'button'): Promise<ElderMessage> {
  const repo = await getRepository();
  const view = await loadElderView(repo);
  if (!view) return { text: '', tone: 'calm' };
  const now = clock.now();
  const answer = answerDidITake(now, view.elder, view.active, view.events);
  await repo.addQuestionEvent({ id: newId('q'), at: now.toISOString(), date: dateKey(now), intent: 'did_i_take', via });
  if (answer.kind === 'ask_family') await raiseAlert(repo, 'unsure_answer', dateKey(now), answer.slot);
  useAppStore.getState().bumpData();
  return { text: renderAnswer(view.ctx, answer), tone: answer.kind === 'ask_family' ? 'ask_family' : 'calm' };
}

/** Record slots that passed the family-alert time without "taken". Safe to call often. */
export async function checkMissed(): Promise<number> {
  const repo = await getRepository();
  const view = await loadElderView(repo);
  if (!view) return 0;
  const slots = newlyMissed(view.now, view.elder, view.active, view.events);
  const date = dateKey(view.now);
  for (const slot of slots) {
    await repo.saveDoseEvent({ id: `de-${date}-${slot}-missed`, date, slot, status: 'missed', source: 'button', at: null });
    await raiseAlert(repo, 'missed', date, slot);
  }
  if (slots.length) useAppStore.getState().bumpData();
  return slots.length;
}

/** The sentence for the home screen (orientation, not an answer). */
export function homeMessage(view: ElderView): string {
  const word = (s: Slot) => SLOT_WORD[view.ctx.lang][s];
  if (view.open) return elderText(view.ctx, 'home.dueNow', { slot: word(view.open.slot) });
  const later = view.states.find((s) => s.status === 'upcoming');
  if (later) {
    return elderText(view.ctx, 'home.next', {
      next: nextText(view.ctx.lang, { slot: later.slot, dueAt: later.window.dueAt, tomorrow: false }),
    });
  }
  return elderText(view.ctx, 'home.allDone');
}

// ---------- Bluetooth pill box ----------

/** Keep the box lights in step with the screen (open slot lit, blinking when late). */
export async function syncBoxLights(view: ElderView): Promise<void> {
  await sendBox(boxCommandsFor(view.states, view.open?.slot ?? null));
}

/**
 * A press / lid-open on the box. The lit slot = "I took it" (same double-dose guard as the
 * screen, no extra confirm: pressing a lit slot is already a deliberate act). Another slot:
 * nothing changes for the elder, the family gets a quiet alert.
 */
export async function handleBoxEvent(e: BoxEvent): Promise<ElderMessage | null> {
  const view = await loadElderView();
  if (!view) return null;
  const nowMin = minutesOfDay(view.now);
  const current = view.states.find((st) => nowMin >= st.window.opensAt && nowMin < st.window.closesAt)?.slot ?? null;
  const action = boxEventAction(e, current);
  if (action.kind === 'taken') return confirmTaken('box');
  if (action.kind === 'wrong_slot') {
    const repo = await getRepository();
    await raiseAlert(repo, 'unsure_check', dateKey(view.now), action.slot, { via: 'box', open: action.open ?? 'none' });
  }
  return null;
}
