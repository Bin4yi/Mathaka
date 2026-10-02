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
