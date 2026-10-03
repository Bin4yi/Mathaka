import { recordablePhrases, type Lang, type Slot, type VoiceClip } from '@mathaka/core';
import { getRepository } from '../db/bootstrap';
import { useAppStore } from '../store/appStore';
import { clock } from './clock';
import { readBytes, writeAppFile } from './fileBytes';
import { newId } from './ids';
import { setVoiceClips } from './speech';

// Family voice recordings: a family member reads the fixed sentences once; the elder then
// hears a familiar voice. Only the person themself records their voice, with consent.

export type Phrase = { key: string; text: string; clip?: VoiceClip };

export async function loadPhrases(): Promise<{ lang: Lang; phrases: Phrase[] } | null> {
  const repo = await getRepository();
  const elder = await repo.getElder();
  if (!elder) return null;
  const people = await repo.listPeople();
  const family = people.find((p) => p.role === 'family') ?? people[0];
  const slots = [...new Set((await repo.listSchedule()).map((s) => s.slot))] as Slot[];
  const ctx = { lang: elder.language, name: elder.preferredName, family: family?.name ?? '' };
  const clips = await repo.listVoiceClips();
  const phrases = recordablePhrases(ctx, slots).map((p) => ({ ...p, clip: clips.find((c) => c.phraseKey === p.key && c.lang === elder.language) }));
  return { lang: elder.language, phrases };
}

/** Tell the speech layer which sentences have a family recording. */
export async function refreshVoiceClips(): Promise<void> {
  const data = await loadPhrases();
  const map = new Map<string, string>();
  for (const p of data?.phrases ?? []) if (p.clip) map.set(p.text, p.clip.path);
  setVoiceClips(map);
}

export async function saveRecording(p: Phrase, lang: Lang, recordedUri: string, personId: string): Promise<void> {
  const repo = await getRepository();
  const name = `${p.key.replace(/[^a-z0-9.]/gi, '_')}-${lang}.m4a`;
  const path = writeAppFile('voice', name, await readBytes(recordedUri));
  await repo.saveVoiceClip({
    id: p.clip?.id ?? newId('vc'),
    phraseKey: p.key,
    lang,
    path,
    recordedBy: personId,
    consentAt: clock.now().toISOString(),
  });
  await repo.addAudit({ id: newId('au'), at: clock.now().toISOString(), actor: personId, action: 'voice_recorded', details: p.key });
  await refreshVoiceClips();
  useAppStore.getState().bumpData();
}
