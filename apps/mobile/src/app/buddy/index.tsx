import type { Lang } from '@mathaka/core';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../../components/AppText';
import { Chip, ChipRow, FamilyButton, Section } from '../../components/family/FamilyUI';
import { PillGraphic } from '../../components/PillGraphic';
import { Screen } from '../../components/Screen';
import { getRepository } from '../../db/bootstrap';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n';
import { currentProfiles, getCalibration, setCalibrator } from '../../services/calibrationService';
import { useAppStore } from '../../store/appStore';

/** Memory Buddy home: one place for every calibration step, with clear status. */
export default function BuddyHome() {
  const lang = useAppStore((s) => s.uiLang);
  const version = useAppStore((s) => s.dataVersion);
  const theme = useTheme();
  const { data } = useLoad(async () => {
    const repo = await getRepository();
    const [people, medicines, profiles, cal] = await Promise.all([repo.listPeople(), repo.listMedicines(), currentProfiles(), getCalibration()]);
    return { people, medicines, profiles, cal };
  }, [version]);
  if (!data) return <Screen>{null}</Screen>;
  const { people, medicines, profiles, cal } = data;
  const nameOf = (id: string | null) => people.find((p) => p.id === id)?.name ?? '?';
  const done = medicines.filter((m) => profiles.some((p) => p.medicineId === m.id)).length;

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'buddy.title')}
      </AppText>
      <AppText lang={lang} size={16} color={theme.textMuted}>
        {t(lang, 'buddy.intro')}
      </AppText>

      <Section title={t(lang, 'buddy.whoAmI')} lang={lang}>
        <ChipRow label={t(lang, 'buddy.whoAmI')}>
          {people.map((p) => (
            <Chip key={p.id} lang={lang} label={p.name} selected={cal.calibratedBy === p.id} onPress={() => void setCalibrator(p.id)} />
          ))}
        </ChipRow>
        <AppText lang={lang} size={16} color={cal.approvedBy ? theme.taken : theme.missed} accessibilityLiveRegion="polite">
          {cal.approvedBy ? t(lang, 'buddy.status.approved', { name: nameOf(cal.approvedBy) }) : t(lang, 'buddy.status.needsCheck')}
          {cal.version ? ` · ${t(lang, 'buddy.version', { v: cal.version })}` : ''}
        </AppText>
      </Section>

      <Step lang={lang} label={`1. ${t(lang, 'buddy.step.profile')}`} to="/buddy/profile" />
      <Step lang={lang} label={`2. ${t(lang, 'buddy.step.prescription')}`} to="/buddy/prescription" />

      <Section title={`3. ${t(lang, 'buddy.step.medicines')} · ${t(lang, 'buddy.progress', { i: done, n: medicines.length })}`} lang={lang}>
        {medicines.length === 0 && <AppText lang={lang} size={16}>{t(lang, 'buddy.noMedicines')}</AppText>}
        {medicines.map((m) => {
          const p = profiles.find((x) => x.medicineId === m.id);
          return (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={`${m.name}. ${p ? t(lang, 'buddy.pillDone', { v: p.version }) : t(lang, 'buddy.pillMissing')}`}
              onPress={() => router.push({ pathname: '/buddy/medicine/[id]', params: { id: m.id } })}
              style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}
            >
              {p ? <PillGraphic spec={p.spec} size={56} /> : <View style={styles.placeholder} />}
              <View style={styles.flex}>
                <AppText lang="en" size={17} bold>
                  {[m.name, m.strength].filter(Boolean).join(' ')}
                </AppText>
                <AppText lang={lang} size={15} color={p ? theme.taken : theme.missed}>
                  {p ? t(lang, 'buddy.pillDone', { v: p.version }) : t(lang, 'buddy.pillMissing')}
                </AppText>
              </View>
            </Pressable>
          );
        })}
        <FamilyButton lang={lang} label={t(lang, 'buddy.addMedicine')} onPress={() => router.push({ pathname: '/buddy/medicine/[id]', params: { id: 'new' } })} />
      </Section>

      <Step lang={lang} label={`4. ${t(lang, 'buddy.step.lookalikes')}`} to="/buddy/lookalikes" />
      <Step lang={lang} label={`5. ${t(lang, 'buddy.step.box')}`} to="/buddy/box" />
      <Step lang={lang} label={`6. ${t(lang, 'buddy.step.approve')}`} to="/buddy/approve" />
      <Step lang={lang} label={t(lang, 'buddy.step.mat')} to="/buddy/mat" />
    </Screen>
  );
}

type Href = Parameters<typeof router.push>[0];

function Step({ lang, label, to }: { lang: Lang; label: string; to: Href }) {
  return <FamilyButton lang={lang} label={label} onPress={() => router.push(to)} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, borderWidth: 2, borderRadius: 14, padding: 8 },
  placeholder: { width: 56, height: 56 },
});
