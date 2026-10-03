import type { Lang } from '@mathaka/core';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { AccessibilityInfo } from 'react-native';

// What the elder hears, in this order:
//  1. a family member's own recording of this exact sentence (familiar voice),
//  2. the phone's TTS voice for the language,
//  3. nothing (the words are always on screen too).

const LOCALE: Record<Lang, string> = { si: 'si-LK', ta: 'ta-LK', en: 'en-GB' };
let voiceCache: Speech.Voice[] | null = null;
/** exact sentence -> recording uri (set by services/voice.ts for the current elder) */
let clips = new Map<string, string>();
let player: AudioPlayer | null = null;

export function setVoiceClips(map: Map<string, string>): void {
  clips = map;
}

export function hasClip(text: string): boolean {
  return clips.has(text);
}

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

export function playUri(uri: string): void {
  Speech.stop();
  try {
    player?.remove();
  } catch {
    // already released
  }
  player = createAudioPlayer({ uri });
  player.play();
}

export async function speak(text: string, lang: Lang, rate = 0.8): Promise<void> {
  // TalkBack users hear the live region / announcement instead of two voices at once.
  if (await AccessibilityInfo.isScreenReaderEnabled()) {
    AccessibilityInfo.announceForAccessibility(text);
    return;
  }
  const clip = clips.get(text);
  if (clip) {
    playUri(clip);
    return;
  }
  const voices = await voicesFor(lang);
  if (voices.length === 0 && lang !== 'en') return;
  Speech.stop();
  Speech.speak(text, { language: voices[0]?.language ?? LOCALE[lang], voice: voices[0]?.identifier, rate, pitch: 1.0 });
}

export function stopSpeaking(): void {
  Speech.stop();
  try {
    player?.pause();
  } catch {
    // nothing playing
  }
}
