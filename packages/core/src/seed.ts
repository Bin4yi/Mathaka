import { addDays, atMinutes, dateKey, slotTimes } from './time';
import type {
  Alert,
  DoseEvent,
  Elder,
  Medicine,
  Person,
  PillProfile,
  ScheduleItem,
  Slot,
} from './types';
import { SLOTS } from './types';

export type DemoData = {
  elder: Elder;
  people: Person[];
  medicines: Medicine[];
  pillProfiles: PillProfile[];
  schedule: ScheduleItem[];
  doseEvents: DoseEvent[];
  alerts: Alert[];
};

/** Past (day offset, slot) pairs that were missed in the demo history. */
const DEMO_MISSED: Array<[number, Slot]> = [
  [-2, 'evening'],
  [-4, 'night'],
  [-6, 'noon'],
];
/** A double dose that the app stopped. */
const DEMO_PREVENTED: Array<[number, Slot]> = [[-3, 'morning']];

/**
 * Demo data for DEMO_MODE. Deterministic for a given `now` (no random numbers),
 * so screenshots and tests are repeatable. Today has no events: the demo starts fresh.
 * Medicine names are demo data only, not advice.
 */
export function buildDemoData(now: Date): DemoData {
  const elder: Elder = {
    id: 'elder-1',
    preferredName: 'Ammi',
    language: 'si',
    times: { wake: '06:30', breakfast: '08:00', lunch: '13:00', dinner: '19:30', sleep: '22:00' },
    a11y: {
      fontScale: 1,
      highContrast: false,
      hearing: false,
      tremor: true,
      screenReader: false,
      confirmTaken: true,
    },
  };

  const people: Person[] = [
    { id: 'p-nimal', name: 'Nimal', role: 'family', relation: 'son', phone: '+94770000001', photoAsset: 'family' },
    { id: 'p-kumari', name: 'Kumari', role: 'buddy', relation: 'daughter', phone: '+94770000002', photoAsset: 'pharmacist' },
  ];

  const medicines: Medicine[] = [
    {
      id: 'm-sugar',
      name: 'Metformin',
      strength: '500 mg',
      form: 'tablet',
      purpose: { si: 'සීනි බෙහෙත', ta: 'சர்க்கரை மருந்து', en: 'sugar medicine' },
      receivedCount: 90,
      remainingCount: 61,
    },
    {
      id: 'm-pressure',
      name: 'Amlodipine',
      strength: '5 mg',
      form: 'tablet',
      purpose: { si: 'ප්‍රෙෂර් බෙහෙත', ta: 'இரத்த அழுத்த மருந்து', en: 'pressure medicine' },
      receivedCount: 60,
      remainingCount: 41,
    },
    {
      id: 'm-cholesterol',
      name: 'Atorvastatin',
      strength: '10 mg',
      form: 'tablet',
      purpose: { si: 'කොලෙස්ටරෝල් බෙහෙත', ta: 'கொலஸ்ட்ரால் மருந்து', en: 'cholesterol medicine' },
      receivedCount: 30,
      remainingCount: 23,
    },
    {
      id: 'm-heart',
      name: 'Heart capsule (demo)',
      strength: '',
      form: 'capsule',
      purpose: { si: 'හෘද බෙහෙත', ta: 'இதய மருந்து', en: 'heart medicine' },
      receivedCount: 30,
      // low on purpose: shows the low-stock alert (< 7 days)
      remainingCount: 5,
    },
  ];

  const profile = (
    medicineId: string,
    assetKey: string,
    spec: PillProfile['spec'],
    description: string,
  ): PillProfile => ({
    id: `pp-${medicineId.slice(2)}`,
    medicineId,
    spec,
    description,
    photoPaths: [],
    assetKey,
    calibratedBy: 'p-kumari',
    approvedBy: 'p-nimal',
    version: 1,
  });

  const pillProfiles: PillProfile[] = [
    profile('m-sugar', 'demoSugarPill',
      { shape: 'oblong', colorA: 'white', score: true, imprint: '500', sizeMm: { length: 19, width: 9 } },
      'white oblong tablet with a line and the number 500'),
    profile('m-pressure', 'demoPressurePill',
      { shape: 'round', colorA: 'pink', imprint: '5', sizeMm: { length: 7, width: 7 } },
      'small pink round tablet with the number 5'),
    profile('m-cholesterol', 'demoCholesterolPill',
      { shape: 'oval', colorA: 'yellow', imprint: '10', sizeMm: { length: 10, width: 6 } },
      'yellow oval tablet with the number 10'),
    profile('m-heart', 'demoHeartCapsule',
      { shape: 'capsule', colorA: 'red', colorB: 'white', split: 'vertical', sizeMm: { length: 18, width: 6 } },
      'red and white capsule'),
  ];

  const schedule: ScheduleItem[] = [
    { id: 's1', medicineId: 'm-sugar', slot: 'morning', count: 1, meal: 'after' },
    { id: 's2', medicineId: 'm-pressure', slot: 'morning', count: 1, meal: 'after' },
    { id: 's3', medicineId: 'm-heart', slot: 'morning', count: 1, meal: 'after' },
    { id: 's4', medicineId: 'm-sugar', slot: 'noon', count: 1, meal: 'after' },
    { id: 's5', medicineId: 'm-pressure', slot: 'evening', count: 1, meal: 'after' },
    { id: 's6', medicineId: 'm-sugar', slot: 'night', count: 1, meal: 'after' },
    { id: 's7', medicineId: 'm-cholesterol', slot: 'night', count: 1, meal: 'any' },
  ];

  const times = slotTimes(elder);
  const doseEvents: DoseEvent[] = [];
  const alerts: Alert[] = [];
  const isIn = (list: Array<[number, Slot]>, d: number, s: Slot) => list.some(([dd, ss]) => dd === d && ss === s);

  for (let d = -7; d <= -1; d++) {
    const day = addDays(now, d);
    const date = dateKey(day);
    for (const [i, slot] of SLOTS.entries()) {
      const id = `de-${date}-${slot}`;
      // small, repeatable delay after the due time (2..23 min)
      const delay = 2 + ((Math.abs(d) * 7 + i * 5) % 22);
      const at = atMinutes(day, times[slot] + delay);
      if (isIn(DEMO_MISSED, d, slot)) {
        doseEvents.push({ id, date, slot, status: 'missed', source: 'seed', at: null });
        alerts.push({
          id: `al-${date}-${slot}`,
          kind: 'missed',
          date,
          slot,
          createdAt: atMinutes(day, times[slot] + 30).toISOString(),
          readAt: d < -2 ? atMinutes(day, times[slot] + 45).toISOString() : null,
        });
        continue;
      }
      doseEvents.push({ id, date, slot, status: 'taken', source: 'seed', at: at.toISOString() });
      if (isIn(DEMO_PREVENTED, d, slot)) {
        doseEvents.push({
          id: `${id}-dup`,
          date,
          slot,
          status: 'prevented_double',
          source: 'seed',
          at: atMinutes(day, times[slot] + delay + 95).toISOString(),
        });
      }
    }
  }

  alerts.push({
    id: 'al-lowstock-heart',
    kind: 'low_stock',
    date: dateKey(now),
    createdAt: atMinutes(addDays(now, -1), 21 * 60).toISOString(),
    readAt: null,
    data: { medicineId: 'm-heart', remaining: 5 },
  });

  return { elder, people, medicines, pillProfiles, schedule, doseEvents, alerts };
}
