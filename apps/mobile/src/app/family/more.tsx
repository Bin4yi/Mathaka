import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Assets } from '../../../assets/generated';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../../components/AppText';
import { Chip, ChipRow, Field, FamilyButton, Section } from '../../components/family/FamilyUI';
import { Screen } from '../../components/Screen';
import { getRepository } from '../../db/bootstrap';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n';
import { getCalm, saveCalm } from '../../services/calm';
import { printFridgeCard } from '../../services/fridgeCard';
import { useAppStore } from '../../store/appStore';

/** Fridge card, clinic date, evening calm mode, screen pinning help, benchmark, about. */
export default function MoreScreen() {
  const lang = useAppStore((s) => s.uiLang);
  const theme = useTheme();
  const [clinic, setClinic] = useState<string | null>(null);
  const [calmFrom, setCalmFrom] = useState<string | null>(null);
  const [calmOn, setCalmOn] = useState<boolean | null>(null);
  const [msg, setMsg] = useState('');

  const { data } = useLoad(async () => {
    const repo = await getRepository();
    return { clinic: (await repo.getSetting<string>('clinicDate')) ?? '', calm: await getCalm() };
  });
  if (!data) return <Screen>{null}</Screen>;
  const clinicValue = clinic ?? data.clinic;
  const from = calmFrom ?? data.calm.from;
  const on = calmOn ?? data.calm.enabled;

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'family.more')}
      </AppText>

      <Section title={t(lang, 'card.button')} lang={lang} icon={Assets.illustrations.pillboxClosed}>
        <AppText lang={lang} size={15} color={theme.textMuted}>{t(lang, 'card.hint')}</AppText>
        <FamilyButton lang={lang} primary label={t(lang, 'card.print')} onPress={async () => {
          try {
            await printFridgeCard();
          } catch (e) {
            setMsg(String(e));
          }
        }} />
      </Section>

      <Section title={t(lang, 'clinic.title')} lang={lang} icon={Assets.icons.calendarClinic}>
        <AppText lang={lang} size={15} color={theme.textMuted}>{t(lang, 'clinic.hint')}</AppText>
        <Field lang="en" label={t(lang, 'clinic.title')} value={clinicValue} keyboard="numbers-and-punctuation" placeholder="2026-10-20" onChange={setClinic} />
        <FamilyButton
          lang={lang}
          label={t(lang, 'common.save')}
          onPress={async () => {
            if (clinicValue && !/^\d{4}-\d{2}-\d{2}$/.test(clinicValue)) return setMsg(t(lang, 'common.badTime'));
            await (await getRepository()).setSetting('clinicDate', clinicValue || null);
            useAppStore.getState().bumpData();
            setMsg(t(lang, 'clinic.saved'));
          }}
        />
      </Section>

      <Section title={t(lang, 'calm.title')} lang={lang} icon={Assets.icons.timeNight}>
        <AppText lang={lang} size={15} color={theme.textMuted}>{t(lang, 'calm.hint')}</AppText>
        <ChipRow label={t(lang, 'calm.title')}>
          <Chip lang={lang} label={t(lang, 'common.on')} selected={on} onPress={() => setCalmOn(true)} />
          <Chip lang={lang} label={t(lang, 'common.off')} selected={!on} onPress={() => setCalmOn(false)} />
        </ChipRow>
        <Field lang="en" label={t(lang, 'calm.from')} value={from} keyboard="numbers-and-punctuation" onChange={setCalmFrom} />
        <FamilyButton
          lang={lang}
          label={t(lang, 'common.save')}
          onPress={async () => {
            try {
              await saveCalm({ enabled: on, from });
              useAppStore.getState().bumpData();
              setMsg(t(lang, 'common.saved'));
            } catch {
              setMsg(t(lang, 'common.badTime'));
            }
          }}
        />
      </Section>

      <Section title={t(lang, 'help.title')} lang={lang} icon={Assets.icons.lock}>
        {(['help.s1', 'help.s2', 'help.s3', 'help.s4'] as const).map((k) => (
          <AppText key={k} lang={lang} size={16}>{t(lang, k)}</AppText>
        ))}
        <AppText lang={lang} size={14} color={theme.textMuted}>{t(lang, 'help.note')}</AppText>
      </Section>

      <Section title={t(lang, 'bench.title')} lang={lang} icon={Assets.icons.checkPhoto}>
        <AppText lang={lang} size={15} color={theme.textMuted}>{t(lang, 'bench.hint')}</AppText>
        <FamilyButton lang={lang} label={t(lang, 'bench.run')} onPress={() => router.push('/family/bench')} />
      </Section>

      <Section title={t(lang, 'about.title')} lang={lang} icon={Assets.brand.logo}>
        <AppText lang={lang} size={16}>{t(lang, 'about.what')}</AppText>
        <View style={styles.block}>
          <AppText lang={lang} size={17} bold>{t(lang, 'about.a11yTitle')}</AppText>
          <AppText lang={lang} size={15}>{t(lang, 'about.a11y')}</AppText>
        </View>
        <View style={styles.block}>
          <AppText lang={lang} size={17} bold>{t(lang, 'about.notYetTitle')}</AppText>
          <AppText lang={lang} size={15}>{t(lang, 'about.notYet')}</AppText>
        </View>
        <View style={styles.block}>
          <AppText lang={lang} size={17} bold>{t(lang, 'about.limitsTitle')}</AppText>
          <AppText lang={lang} size={15}>{t(lang, 'about.limits')}</AppText>
        </View>
        <AppText lang={lang} size={14} color={theme.textMuted}>{t(lang, 'about.open')}</AppText>
      </Section>
      {!!msg && <AppText lang={lang} size={16} accessibilityLiveRegion="polite">{msg}</AppText>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: 4 },
});
