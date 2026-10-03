import { pillDistance, type PillLook } from './vision/features';

// Pill check = a helper, never the main ID (the schedule + box slot are).
// It can only say: "matches pill X", "unsure" or "looks new". Never "take X instead".

/** Closer than this: it is that pill. */
export const MATCH_DISTANCE = 0.12;
/** Further than this from every calibrated pill: a new-looking pill (brand change?). */
export const UNKNOWN_DISTANCE = 0.22;
/** The best match must beat the second best by this much, else "unsure". */
export const MATCH_MARGIN = 0.04;

export type MatchResult =
  | { kind: 'match'; id: string; distance: number; margin: number }
  | { kind: 'unsure'; id: string | null; distance: number; margin: number }
  | { kind: 'unknown'; distance: number };

export function matchPill(test: PillLook, calibrated: { id: string; look: PillLook }[]): MatchResult {
  if (calibrated.length === 0) return { kind: 'unknown', distance: 1 };
  const scored = calibrated.map((c) => ({ id: c.id, d: pillDistance(test, c.look) })).sort((a, b) => a.d - b.d);
  const best = scored[0]!;
  const margin = (scored[1]?.d ?? 1) - best.d;
  if (best.d > UNKNOWN_DISTANCE) return { kind: 'unknown', distance: best.d };
  if (best.d <= MATCH_DISTANCE && margin >= MATCH_MARGIN) return { kind: 'match', id: best.id, distance: best.d, margin };
  return { kind: 'unsure', id: best.id, distance: best.d, margin };
}

/**
 * Check the pills shown for ONE slot. Every expected pill must be matched once;
 * anything unclear goes to a human.
 */
export function checkSlotPills(
  shown: PillLook[],
  expected: { id: string; look: PillLook }[],
  allCalibrated: { id: string; look: PillLook }[],
): { kind: 'all_match' } | { kind: 'ask_family'; reason: 'mismatch' | 'unsure' | 'missing' } | { kind: 'new_pill' } {
  const results = shown.map((s) => matchPill(s, allCalibrated));
  if (results.some((r) => r.kind === 'unknown')) return { kind: 'new_pill' };
  if (results.some((r) => r.kind === 'unsure')) return { kind: 'ask_family', reason: 'unsure' };
  const ids = results.map((r) => (r.kind === 'match' ? r.id : ''));
  const want = new Set(expected.map((e) => e.id));
  if (ids.some((id) => !want.has(id))) return { kind: 'ask_family', reason: 'mismatch' };
  if ([...want].some((id) => !ids.includes(id))) return { kind: 'ask_family', reason: 'missing' };
  return { kind: 'all_match' };
}
