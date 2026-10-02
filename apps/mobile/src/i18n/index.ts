import type { Lang } from '@mathaka/core';
import { en, type StringKey } from './en';
import { si } from './si';
import { ta } from './ta';

export type { StringKey };
const TABLES: Record<Lang, Record<StringKey, string>> = { en, si, ta };

export const LANG_NAMES: Record<Lang, string> = { si: 'සිංහල', ta: 'தமிழ்', en: 'English' };

/** Fill "{name}" style placeholders. Missing values stay visible so bugs are easy to spot. */
export function t(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  const s = TABLES[lang][key] ?? en[key];
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}
