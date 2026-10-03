import { addDays, dateKey, slotStates, type Alert, type DoseEvent, type Medicine, type PillProfile, type SlotState } from '@mathaka/core';
import { getRepository } from '../db/bootstrap';
import { useAppStore } from '../store/appStore';
import { clock } from './clock';
import { loadElderView, type ElderView } from './doseService';

export type DayRow = { date: string; states: SlotState[]; prevented: number };

export type FamilyView = {
  elderView: ElderView;
  today: SlotState[];
  preventedToday: DoseEvent[];
  questionsToday: number;
  week: DayRow[];
  alerts: Alert[];
  medicines: Medicine[];
  profiles: PillProfile[];
  counts: { taken: number; missed: number; prevented: number };
  storage: string;
};

export async function loadFamilyView(): Promise<FamilyView | null> {
  const repo = await getRepository();
  const elderView = await loadElderView(repo);
  if (!elderView) return null;
  const now = clock.now();
  // clinic visit in the next 3 days -> one reminder
  const clinic = await repo.getSetting<string>('clinicDate');
  if (clinic && /^d{4}-d{2}-d{2}$/.test(clinic)) {
    const days = Math.round((new Date(`${clinic}T00:00:00`).getTime() - new Date(`${dateKey(now)}T00:00:00`).getTime()) / 86_400_000);
    const id = `al-clinic_soon-${clinic}`;
    if (days >= 0 && days <= 3 && !(await repo.listAlerts()).some((a) => a.id === id)) {
      await repo.saveAlert({ id, kind: 'clinic_soon', date: dateKey(now), createdAt: now.toISOString(), readAt: null, data: { date: clinic } });
    }
  }
  const from = dateKey(addDays(now, -6));
  const events = await repo.listDoseEvents(from, dateKey(now));
  const [alerts, medicines, profiles, questions] = await Promise.all([
    repo.listAlerts(),
    repo.listMedicines(),
    repo.listPillProfiles(),
    repo.listQuestionEvents(dateKey(now)),
  ]);

  // Past days: evaluate each day at its very end, so the states are final.
  const week: DayRow[] = [];
  for (let d = -6; d <= 0; d++) {
    const day = addDays(now, d);
    const at = d === 0 ? now : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59);
    const date = dateKey(day);
    const dayEvents = events.filter((e) => e.date === date);
    week.push({
      date,
      states: slotStates(at, elderView.elder, elderView.active, dayEvents),
      prevented: dayEvents.filter((e) => e.status === 'prevented_double').length,
    });
  }
  const finals = week.flatMap((w) => w.states);

  return {
    elderView,
    today: elderView.states,
    preventedToday: elderView.events.filter((e) => e.status === 'prevented_double'),
    questionsToday: questions.filter((q) => q.intent === 'did_i_take').length,
    week,
    alerts,
    medicines,
    profiles,
    counts: {
      taken: finals.filter((s) => s.status === 'taken').length,
      missed: finals.filter((s) => s.status === 'missed').length,
      prevented: week.reduce((n, w) => n + w.prevented, 0),
    },
    storage: repo.kind,
  };
}

export async function markAlertRead(alert: Alert): Promise<void> {
  const repo = await getRepository();
  await repo.saveAlert({ ...alert, readAt: clock.now().toISOString() });
  useAppStore.getState().bumpData();
}

/**
 * Plain facts from the log for the weekly summary. The AI may only rephrase these;
 * it gets no medicine names and is told not to give advice.
 */
export function weekFacts(v: FamilyView): string[] {
  const total = v.week.reduce((n, w) => n + w.states.filter((s) => s.status !== 'upcoming').length, 0);
  const facts = [`${v.counts.taken} of ${total} doses were confirmed as taken in the last 7 days.`];
  const missed = v.week.flatMap((w) => w.states.filter((s) => s.status === 'missed').map((s) => `${w.date} ${s.slot}`));
  facts.push(missed.length ? `Not confirmed: ${missed.join(', ')}.` : 'No dose was missed.');
  if (v.counts.prevented) facts.push(`A second dose was stopped ${v.counts.prevented} time(s).`);
  if (v.questionsToday) facts.push(`Today the question "Did I take my medicine?" was asked ${v.questionsToday} time(s).`);
  const low = v.medicines.filter((m) => m.remainingCount > 0 && m.remainingCount < 7).length;
  if (low) facts.push(`${low} medicine(s) are running low and need a refill.`);
  return facts;
}
