import type { Meal, PillColorName, PillProfile, PillShape, PillSpec, Slot } from './types';
import { SLOTS } from './types';
import { LOOKALIKE_DISTANCE, pillDistance, type PillLook } from './vision/features';
import type { Lab } from './vision/image';
import type { PillFeatures } from './vision/pipeline';

// ---------- combine the photos of one pill ----------

function majority<T>(xs: T[]): T | undefined {
  const count = new Map<T, number>();
  for (const x of xs) count.set(x, (count.get(x) ?? 0) + 1);
  let best: T | undefined;
  let n = 0;
  for (const [k, v] of count) if (v > n) [best, n] = [k, v];
  return best;
}
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const meanLab = (xs: Lab[]): Lab => [0, 1, 2].map((i) => xs.reduce((s, x) => s + x[i]!, 0) / xs.length) as Lab;

export type CombinedLook = { spec: PillSpec; look: PillLook; confidence: number; agree: boolean };

/**
 * Front, back and front-in-other-light -> one pill look.
 * Shape/colours by majority, size by median. A score line on ANY side counts
 * (many tablets are scored on one side only).
 */
export function combinePhotos(list: PillFeatures[]): CombinedLook | null {
  const fs = list.filter(Boolean);
  if (fs.length === 0) return null;
  const shape = majority(fs.map((f) => f.shape)) as PillShape;
  const split = majority(fs.map((f) => f.split)) ?? 'none';
  const colorA = majority(fs.map((f) => f.colorA)) as PillColorName;
  const twoTone = fs.filter((f) => f.split !== 'none');
  const colorB = split !== 'none' ? (majority(twoTone.map((f) => f.colorB).filter(Boolean)) as PillColorName | undefined) : undefined;
  const sized = fs.filter((f) => f.sizeMm);
  const sizeMm = sized.length
    ? { length: median(sized.map((f) => f.sizeMm!.length)), width: median(sized.map((f) => f.sizeMm!.width)) }
    : undefined;
  const spec: PillSpec = { shape, colorA, colorB, split, score: fs.some((f) => f.score), sizeMm };
  const look: PillLook = {
    ...spec,
    labA: meanLab(fs.filter((f) => f.colorA === colorA || f.split !== 'none').map((f) => f.labA)),
    labB: colorB ? meanLab(twoTone.filter((f) => f.labB).map((f) => f.labB!)) : undefined,
  };
  const agree = fs.every((f) => f.shape === shape && f.colorA === colorA);
  const confidence = Math.min(...fs.map((f) => f.confidence)) * (agree ? 1 : 0.7);
  return { spec, look, confidence: Math.round(confidence * 100) / 100, agree };
}

// ---------- look-alikes ----------

export type LookalikeFound = { a: string; b: string; distance: number };

/** All pairs of calibrated pills that look too similar (attribute distance). */
export function findLookalikes(profiles: Pick<PillProfile, 'id' | 'medicineId' | 'spec'>[], threshold = LOOKALIKE_DISTANCE): LookalikeFound[] {
  const out: LookalikeFound[] = [];
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const a = profiles[i]!, b = profiles[j]!;
      if (a.medicineId === b.medicineId) continue;
      const d = pillDistance(a.spec, b.spec);
      if (d < threshold) out.push({ a: a.id, b: b.id, distance: Math.round(d * 1000) / 1000 });
    }
  }
  return out.sort((x, y) => x.distance - y.distance);
}

// ---------- prescription frequency -> slots (rule-based; the decision layer is compared to this) ----------

export type FrequencyReading = { slots: Slot[]; meal: Meal; confidence: number; rule: string };

const ABBREV: [RegExp, Slot[], string][] = [
  [/\b(qid|qds|4\s*times)\b/, ['morning', 'noon', 'evening', 'night'], 'qid'],
  [/\b(tds|tid|3\s*times|thrice)\b/, ['morning', 'noon', 'evening'], 'tds'],
  [/\b(bd|bid|twice|2\s*times)\b/, ['morning', 'evening'], 'bd'],
  [/\b(nocte|hs|at\s*night|bed\s*time|bedtime)\b/, ['night'], 'nocte'],
  [/\b(mane|morning|om)\b/, ['morning'], 'mane'],
  [/\b(od|once\s*daily|daily|1\s*time)\b/, ['morning'], 'od'],
];

/**
 * Read common clinic-book frequency notes: "1 bd pc", "nocte", "1-0-1", "tds ac".
 * Positional patterns: a-b-c = morning-noon-evening(dinner), a-b-c-d adds night.
 * Unknown text -> empty slots, low confidence (the Memory Buddy must choose).
 */
export function readFrequency(raw: string): FrequencyReading {
  const s = raw.toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
  const meal: Meal = /\b(pc|after\s*(food|meals?))\b/.test(s) ? 'after' : /\b(ac|before\s*(food|meals?))\b/.test(s) ? 'before' : 'any';

  // \b does not work next to "½", so use explicit boundaries
  const pos = /(?<![\d/½])(\d(?:\/\d)?|½)\s*-\s*(\d(?:\/\d)?|½)\s*-\s*(\d(?:\/\d)?|½)(?:\s*-\s*(\d(?:\/\d)?|½))?(?![\d/½])/.exec(s);
  if (pos) {
    const parts = pos.slice(1).filter((x) => x !== undefined);
    const order: Slot[] = parts.length === 4 ? ['morning', 'noon', 'evening', 'night'] : ['morning', 'noon', 'evening'];
    const slots = order.filter((_, i) => parts[i] !== '0');
    return { slots, meal, confidence: parts.length === 4 ? 0.95 : 0.85, rule: `pattern ${parts.join('-')}` };
  }
  for (const [re, slots, rule] of ABBREV) {
    if (re.test(s)) return { slots: [...slots], meal, confidence: rule === 'od' ? 0.7 : 0.9, rule };
  }
  return { slots: [], meal, confidence: 0.2, rule: 'unknown' };
}

/** Sort slots in day order (stable display). */
export function sortSlots(slots: Slot[]): Slot[] {
  return SLOTS.filter((s) => slots.includes(s));
}
