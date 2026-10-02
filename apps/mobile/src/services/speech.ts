import type { Lang } from '@mathaka/core';
import * as Speech from 'expo-speech';
import { AccessibilityInfo } from 'react-native';

// Phone TTS (on device). Family voice clips come first in M8; this is the fallback.
// If the phone has no voice for the elder's language we stay silent: the words are
// always on screen too.

const LOCALE: Record<Lang, string> = { si: 'si-LK', ta: 'ta-LK', en: 'en-GB' };
let voiceCache: Speech.Voice[] | null = null;

export async function voicesFor(lang: Lang): Promise<Speech.Voice[]> {
  try {
    voiceCache ??= await Speech.getAvailableVoicesAsync();
  } catch {
    voiceCache = [];
  }
  return voiceCache.filter((v) => v.language.toLowerCase().startsWith(lang));
}

export async function hasVoice(lang: Lang): Promise<boolean> {
  return (await voicesFor(lang)).length > 0;
}

export async function speak(text: string, lang: Lang, rate = 0.8): Promise<void> {
  // TalkBack users hear the live region / announcement instead of two voices at once.
  if (await AccessibilityInfo.isScreenReaderEnabled()) {
    AccessibilityInfo.announceForAccessibility(text);
    return;
  }
  const voices = await voicesFor(lang);
  if (voices.length === 0 && lang !== 'en') return;
  Speech.stop();
  Speech.speak(text, { language: voices[0]?.language ?? LOCALE[lang], voice: voices[0]?.identifier, rate, pitch: 1.0 });
}

export function stopSpeaking(): void {
  Speech.stop();
}
