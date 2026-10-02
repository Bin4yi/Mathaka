import { LANGS, type Lang } from '@mathaka/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { SIZE, type ThemeChoice } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../../components/AppText';
import { Chip, ChipRow, FamilyButton, Section } from '../../components/family/FamilyUI';
import { Screen } from '../../components/Screen';
import { getRepository } from '../../db/bootstrap';
import { useLoad } from '../../hooks/useLoad';
import { LANG_NAMES, t } from '../../i18n';
import { loadElderView } from '../../services/doseService';
import {
  NOTIFICATIONS_SUPPORTED,
  requestNotificationPermission,
  rescheduleReminders,
  scheduledCount,
} from '../../services/notifications';
import { saveRole, savePin, saveSpeechRate, saveThemeChoice, saveUiLang } from '../../services/settings';
import { hasVoice } from '../../services/speech';
import { useAppStore } from '../../store/appStore';

const THEMES: ThemeChoice[] = ['system', 'light', 'dark', 'highContrast'];

export default function SettingsScreen() {
  const lang = useAppStore((s) => s.uiLang);
  const themeChoice = useAppStore((s) => s.themeChoice);
  const rate = useAppStore((s) => s.speechRate);
  const version = useAppStore((s) => s.dataVersion);
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');

  const { data, reload } = useLoad(async () => {
    const repo = await getRepository();
    const elder = await repo.getElder();
    return {
      elder,
      voice: elder ? await hasVoice(elder.language) : false,
      reminders: NOTIFICATIONS_SUPPORTED ? await scheduledCount() : 0,
    };
  }, [version]);

  const elder = data?.elder;

  const updateElder = async (patch: { language?: Lang; confirmTaken?: boolean }) => {
    if (!elder) return;
    const repo = await getRepository();
    await repo.saveElder({
      ...elder,
      language: patch.language ?? elder.language,
      a11y: { ...elder.a11y, confirmTaken: patch.confirmTaken ?? elder.a11y.confirmTaken },
    });
    useAppStore.getState().bumpData();
  };

  const allowReminders = async () => {
    if (await requestNotificationPermission()) {
      const view = await loadElderView();
      if (view) await rescheduleReminders(view);
    }
    await reload();
  };

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'settings.title')}
      </AppText>

      <Section title={t(lang, 'settings.uiLang')} lang={lang}>
        <ChipRow label={t(lang, 'settings.uiLang')}>
          {LANGS.map((l) => (
            <Chip key={l} lang={l} label={LANG_NAMES[l]} selected={l === lang} onPress={() => void saveUiLang(l)} />
          ))}
        </ChipRow>
      </Section>

      {elder && (
        <Section title={t(lang, 'settings.elderLang')} lang={lang}>
          <ChipRow label={t(lang, 'settings.elderLang')}>
            {LANGS.map((l) => (
              <Chip key={l} lang={l} label={LANG_NAMES[l]} selected={l === elder.language} onPress={() => void updateElder({ language: l })} />
            ))}
          </ChipRow>
          <AppText lang={lang} size={16} bold>
            {t(lang, 'settings.voice')}
          </AppText>
          <AppText lang={lang} size={16} color={theme.textMuted}>
            {t(lang, data?.voice ? 'settings.voiceYes' : 'settings.voiceNo')}
          </AppText>
        </Section>
      )}

      <Section title={t(lang, 'settings.theme')} lang={lang}>
        <ChipRow label={t(lang, 'settings.theme')}>
          {THEMES.map((c) => (
            <Chip key={c} lang={lang} label={t(lang, `theme.${c}`)} selected={c === themeChoice} onPress={() => void saveThemeChoice(c)} />
          ))}
        </ChipRow>
      </Section>

      {elder && (
        <Section title={t(lang, 'settings.confirmStep')} lang={lang}>
          <AppText lang={lang} size={16} color={theme.textMuted}>
            {t(lang, 'settings.confirmStepHint')}
          </AppText>
          <ChipRow label={t(lang, 'settings.confirmStep')}>
            <Chip lang={lang} label={t(lang, 'common.on')} selected={elder.a11y.confirmTaken} onPress={() => void updateElder({ confirmTaken: true })} />
            <Chip lang={lang} label={t(lang, 'common.off')} selected={!elder.a11y.confirmTaken} onPress={() => void updateElder({ confirmTaken: false })} />
          </ChipRow>
        </Section>
      )}

      <Section title={t(lang, 'settings.speechRate')} lang={lang}>
        <ChipRow label={t(lang, 'settings.speechRate')}>
          <Chip lang={lang} label={t(lang, 'speech.slow')} selected={rate < 0.9} onPress={() => void saveSpeechRate(0.8)} />
          <Chip lang={lang} label={t(lang, 'speech.normal')} selected={rate >= 0.9} onPress={() => void saveSpeechRate(1)} />
        </ChipRow>
      </Section>

      <Section title={t(lang, 'settings.reminders')} lang={lang}>
        {!NOTIFICATIONS_SUPPORTED ? (
          <AppText lang={lang} size={16}>{t(lang, 'settings.remindersWeb')}</AppText>
        ) : data && data.reminders > 0 ? (
          <AppText lang={lang} size={16}>{t(lang, 'settings.remindersOn', { n: data.reminders })}</AppText>
        ) : (
          <FamilyButton lang={lang} label={t(lang, 'settings.remindersOff')} onPress={allowReminders} />
        )}
      </Section>

      <Section title={t(lang, 'settings.pin')} lang={lang}>
        <View style={styles.row}>
          <TextInput
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            accessibilityLabel={t(lang, 'settings.pin')}
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          />
          <FamilyButton
            lang={lang}
            label={t(lang, 'common.save')}
            onPress={async () => {
              if (pin.length !== 4) return;
              await savePin(pin);
              setPin('');
              setPinMsg(t(lang, 'settings.pinSaved'));
            }}
          />
        </View>
        {!!pinMsg && <AppText lang={lang} size={16} accessibilityLiveRegion="polite">{pinMsg}</AppText>}
      </Section>

      <FamilyButton
        lang={lang}
        label={t(lang, 'family.switchRole')}
        onPress={async () => {
          await saveRole(null);
          router.replace('/role-picker');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  input: { flex: 1, minHeight: 56, borderWidth: 2, borderRadius: 12, fontSize: 24, paddingHorizontal: 12, letterSpacing: 8 },
});
