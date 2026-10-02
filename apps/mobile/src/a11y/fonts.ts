import type { Lang } from '@mathaka/core';
import { NotoSans_400Regular, NotoSans_700Bold } from '@expo-google-fonts/noto-sans';
import { NotoSansSinhala_400Regular, NotoSansSinhala_700Bold } from '@expo-google-fonts/noto-sans-sinhala';
import { NotoSansTamil_400Regular, NotoSansTamil_700Bold } from '@expo-google-fonts/noto-sans-tamil';

export const FONT_FILES = {
  NotoSans_400Regular,
  NotoSans_700Bold,
  NotoSansSinhala_400Regular,
  NotoSansSinhala_700Bold,
  NotoSansTamil_400Regular,
  NotoSansTamil_700Bold,
};

const FAMILY: Record<Lang, [string, string]> = {
  en: ['NotoSans_400Regular', 'NotoSans_700Bold'],
  si: ['NotoSansSinhala_400Regular', 'NotoSansSinhala_700Bold'],
  ta: ['NotoSansTamil_400Regular', 'NotoSansTamil_700Bold'],
};

export function fontFor(lang: Lang, bold = false): string {
  return FAMILY[lang][bold ? 1 : 0];
}

/**
 * Sinhala and Tamil have tall vowel signs above and below the line.
 * A generous line height stops them being cut off.
 */
export function lineHeightFor(lang: Lang, fontSize: number): number {
  return Math.round(fontSize * (lang === 'en' ? 1.3 : 1.6));
}
