import type { Person } from '@mathaka/core';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Assets } from '../../../assets/generated';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../../components/AppText';
import { Chip, ChipRow, FamilyButton, Section } from '../../components/family/FamilyUI';
import { Screen } from '../../components/Screen';
import { getRepository } from '../../db/bootstrap';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n';
import { playUri } from '../../services/speech';
import { loadPhrases, saveRecording, type Phrase } from '../../services/voice';
import { useAppStore } from '../../store/appStore';
import { NeuCard, neuShadow } from '../../ui/surfaces';

/** A family member records the fixed sentences in their own voice (with consent). */
export default function VoiceScreen() {
  const lang = useAppStore((s) => s.uiLang);
  const version = useAppStore((s) => s.dataVersion);
  const theme = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rec = useAudioRecorderState(recorder);
  const [who, setWho] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const { data } = useLoad(async () => {
    const repo = await getRepository();
    return { people: await repo.listPeople(), elder: await repo.getElder(), phrases: await loadPhrases() };
  }, [version]);
  if (!data?.phrases || !data.elder) return <Screen>{null}</Screen>;
  const { phrases, lang: elderLang } = data.phrases;
  const nameOf = (id: string) => data.people.find((p: Person) => p.id === id)?.name ?? '?';

  const start = async (p: Phrase) => {
    setMsg('');
    if (!who || !consent) return setMsg(t(lang, 'voice.needConsent'));
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) return setMsg(t(lang, 'voice.noMic'));
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setActive(p.key);
  };

  const stop = async (p: Phrase) => {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    setActive(null);
    if (recorder.uri && who) await saveRecording(p, elderLang, recorder.uri, who);
  };

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'voice.title')}
      </AppText>
      <AppText lang={lang} size={16} color={theme.textMuted}>{t(lang, 'voice.hint')}</AppText>

      <Section title={t(lang, 'voice.who')} lang={lang} icon={Assets.icons.family}>
        <ChipRow label={t(lang, 'voice.who')}>
          {data.people.map((p) => (
            <Chip key={p.id} lang={lang} label={p.name} selected={who === p.id} onPress={() => setWho(p.id)} />
          ))}
        </ChipRow>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          accessibilityLabel={t(lang, 'voice.consent', { name: data.elder.preferredName })}
          onPress={() => setConsent(!consent)}
          style={styles.consent}
        >
          <View style={[styles.box, { backgroundColor: consent ? theme.primary : theme.surface, boxShadow: neuShadow(theme, 4, !consent), borderColor: theme.outline }]}>
            {consent && <AppText lang="en" size={20} bold color={theme.onPrimary}>✓</AppText>}
          </View>
          <AppText lang={lang} size={16} style={styles.flex}>
            {t(lang, 'voice.consent', { name: data.elder.preferredName })}
          </AppText>
        </Pressable>
      </Section>

      {phrases.map((p) => (
        <NeuCard key={p.key} depth={6} style={styles.card}>
          <AppText lang={elderLang} size={20} bold>
            {p.text}
          </AppText>
          <AppText lang={lang} size={14} color={p.clip ? theme.taken : theme.textMuted}>
            {p.clip ? t(lang, 'voice.recorded', { name: nameOf(p.clip.recordedBy) }) : t(lang, 'voice.notYet')}
          </AppText>
          <View style={styles.row}>
            {active === p.key ? (
              <View style={styles.flex}>
                <FamilyButton lang={lang} primary label={`${t(lang, 'voice.stop')} · ${t(lang, 'voice.recording', { s: Math.round(rec.durationMillis / 1000) })}`} onPress={() => stop(p)} />
              </View>
            ) : (
              <View style={styles.flex}>
                <FamilyButton lang={lang} primary={!p.clip} label={p.clip ? t(lang, 'voice.again') : t(lang, 'voice.record')} onPress={() => start(p)} />
              </View>
            )}
            {p.clip && active !== p.key && (
              <View style={styles.flex}>
                <FamilyButton lang={lang} label={t(lang, 'voice.play')} icon={Assets.icons.speaker} onPress={() => playUri(p.clip!.path)} />
              </View>
            )}
          </View>
        </NeuCard>
      ))}
      {!!msg && <AppText lang={lang} size={16} color={theme.missed} accessibilityLiveRegion="polite">{msg}</AppText>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  card: { padding: 16, gap: 10 },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  box: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
