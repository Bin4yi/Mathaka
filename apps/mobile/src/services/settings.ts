import { LANGS, type DeviceRole, type Lang } from '@mathaka/core';
import { getLocales } from 'expo-localization';
import { getRepository } from '../db/bootstrap';
import { useAppStore } from '../store/appStore';

function deviceLang(): Lang {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return (LANGS as readonly string[]).includes(code) ? (code as Lang) : 'en';
}

/** Read saved role + UI language into the store at app start. */
export async function loadAppSettings(): Promise<void> {
  const repo = await getRepository();
  const role = await repo.getSetting<DeviceRole>('deviceRole');
  const lang = (await repo.getSetting<Lang>('uiLang')) ?? deviceLang();
  useAppStore.setState({ role, uiLang: lang });
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
