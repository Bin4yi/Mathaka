import { LANGS, type DeviceRole, type Lang } from '@mathaka/core';
import * as Crypto from 'expo-crypto';
import { getLocales } from 'expo-localization';
import { Platform } from 'react-native';
import type { ThemeChoice } from '../a11y/tokens';
import { DEMO_MODE } from '../config';
import { getRepository } from '../db/bootstrap';
import { useAppStore } from '../store/appStore';
import { demoClock } from './clock';

const DEFAULT_PIN = '1234';

function deviceLang(): Lang {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return (LANGS as readonly string[]).includes(code) ? (code as Lang) : 'en';
}

/** Read saved settings into the store at app start. */
export async function loadAppSettings(): Promise<void> {
  const repo = await getRepository();
  const role = await repo.getSetting<DeviceRole>('deviceRole');
  const lang = (await repo.getSetting<Lang>('uiLang')) ?? deviceLang();
  const themeChoice = (await repo.getSetting<ThemeChoice>('themeChoice')) ?? 'system';
  const speechRate = (await repo.getSetting<number>('speechRate')) ?? 0.8;
  const demoOffsetMs = DEMO_MODE ? ((await repo.getSetting<number>('demoOffsetMs')) ?? 0) : 0;
  demoClock.setOffsetMs(demoOffsetMs);
  useAppStore.setState({ role, uiLang: lang, themeChoice, speechRate, demoOffsetMs });
  applyWebDemoParams();
}

/**
 * Web preview only, DEMO_MODE only: `?demoTime=08:10&theme=highContrast&lang=si` in the URL,
 * so screenshots for the docs/post can be made at a fixed time without clicking.
 */
function applyWebDemoParams(): void {
  if (!DEMO_MODE || Platform.OS !== 'web' || typeof window === 'undefined') return;
  const q = new URLSearchParams(window.location.search);
  const time = /^(\d{1,2}):(\d{2})$/.exec(q.get('demoTime') ?? '');
  if (time) {
    demoClock.jumpTo(Number(time[1]), Number(time[2]));
    useAppStore.setState({ demoOffsetMs: demoClock.getOffsetMs() });
  }
  const theme = q.get('theme');
  if (theme && ['system', 'light', 'dark', 'highContrast'].includes(theme)) {
    useAppStore.setState({ themeChoice: theme as ThemeChoice });
  }
  const lang = q.get('lang');
  if (lang && (LANGS as readonly string[]).includes(lang)) useAppStore.setState({ uiLang: lang as Lang });
}

export async function saveRole(role: DeviceRole | null): Promise<void> {
  const repo = await getRepository();
  await repo.setSetting('deviceRole', role);
  useAppStore.getState().setRole(role);
}

export async function saveUiLang(lang: Lang): Promise<void> {
  const repo = await getRepository();
  await repo.setSetting('uiLang', lang);
  useAppStore.getState().setUiLang(lang);
}

export async function saveThemeChoice(choice: ThemeChoice): Promise<void> {
  const repo = await getRepository();
  await repo.setSetting('themeChoice', choice);
  useAppStore.getState().setThemeChoice(choice);
}

export async function saveSpeechRate(rate: number): Promise<void> {
  const repo = await getRepository();
  await repo.setSetting('speechRate', rate);
  useAppStore.setState({ speechRate: rate });
}

/** Demo time: jump the app clock to hh:mm today, or back to real time (null). */
export async function setDemoTime(hours: number | null, minutes = 0): Promise<void> {
  if (!DEMO_MODE) return;
  if (hours === null) demoClock.reset();
  else demoClock.jumpTo(hours, minutes);
  const repo = await getRepository();
  await repo.setSetting('demoOffsetMs', demoClock.getOffsetMs());
  useAppStore.setState({ demoOffsetMs: demoClock.getOffsetMs() });
  useAppStore.getState().bumpData();
}

// ---- family PIN (stored as a SHA-256 hash) ----

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `mathaka:${pin}`);
}

export async function checkPin(pin: string): Promise<boolean> {
  const repo = await getRepository();
  const saved = await repo.getSetting<string>('familyPinHash');
  return (saved ?? (await hashPin(DEFAULT_PIN))) === (await hashPin(pin));
}

export async function savePin(pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be 4 digits');
  const repo = await getRepository();
  await repo.setSetting('familyPinHash', await hashPin(pin));
}

export async function isDefaultPin(): Promise<boolean> {
  const repo = await getRepository();
  return (await repo.getSetting<string>('familyPinHash')) === null;
}
