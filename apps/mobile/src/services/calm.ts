import { minutesOfDay, parseHm } from '@mathaka/core';
import { getRepository } from '../db/bootstrap';

// Evening calm mode: after a set time, elder screens use softer dark colours and slower speech.

export type CalmSettings = { enabled: boolean; from: string };
export const DEFAULT_CALM: CalmSettings = { enabled: true, from: '19:00' };

export async function getCalm(): Promise<CalmSettings> {
  return { ...DEFAULT_CALM, ...((await (await getRepository()).getSetting<CalmSettings>('calm')) ?? {}) };
}

export async function saveCalm(c: CalmSettings): Promise<void> {
  parseHm(c.from); // throws on a bad time
  await (await getRepository()).setSetting('calm', c);
}

/** On from `from` until 05:00 the next morning. */
export async function calmActiveAt(now: Date): Promise<boolean> {
  const c = await getCalm();
  if (!c.enabled) return false;
  const m = minutesOfDay(now);
  try {
    return m >= parseHm(c.from) || m < 5 * 60;
  } catch {
    return false;
  }
}
