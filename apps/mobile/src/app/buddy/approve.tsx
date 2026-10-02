import { pillsBySlot, pillWords, SLOTS } from '@mathaka/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../../components/AppText';
import { countText } from '../../components/elder/SlotPillCard';
import { Chip, ChipRow, FamilyButton, Section } from '../../components/family/FamilyUI';
import { Backdrop } from '../../components/Icon';
import { PillGraphic } from '../../components/PillGraphic';
import { Screen } from '../../components/Screen';
import { getRepository } from '../../db/bootstrap';
import { useLoad } from '../../hooks/useLoad';
import { t, type StringKey } from '../../i18n';
import { approve, currentProfiles, getCalibration } from '../../services/calibrationService';
import { useAppStore } from '../../store/appStore';

/** Step 6: a DIFFERENT person checks the whole calibration on one screen and approves it. */
export default function ApproveScreen() {
  const lang = useAppStore((s) => s.uiLang);
  const version = useAppStore((s) => s.dataVersion);
  const theme = useTheme();
  const [who, setWho] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const { data } = useLoad(async () => {
    const repo = await getRepository();
    const [elder, people, schedule, medicines, profiles, cal] = await Promise.all([
      repo.getElder(), repo.listPeople(), repo.listSchedule(), repo.listMedicines(), currentProfiles(), getCalibration(),
    ]);
    return { elder, people, bySlot: pillsBySlot(schedule, medicines, profiles), cal };
  }, [version]);
  if (!data) return <Screen>{null}</Screen>;
  const { people, bySlot, cal } = data;
  const nameOf = (id: string | null) => people.find((p) => p.id === id)?.name ?? '?';

  const doApprove = async () => {
    if (!cal.calibratedBy) return setMsg(t(lang, 'approve.noCalibrator'));
    if (!who || who === cal.calibratedBy) return setMsg(t(lang, 'approve.same'));
    await approve(who);
    router.replace('/buddy/home');
  };

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'approve.title')}
      </AppText>
      <AppText lang={lang} size={16} color={theme.textMuted}>{t(lang, 'approve.hint')}</AppText>
      {cal.approvedBy && cal.approvedAt && (
        <AppText lang={lang} size={16} color={theme.taken}>
          {t(lang, 'approve.done', { name: nameOf(cal.approvedBy), date: cal.approvedAt.slice(0, 10) })}
        </AppText>
      )}

      {data.elder && (
        <Section title={data.elder.preferredName} lang={lang}>
          <AppText lang={lang} size={16}>
            {Object.entries(data.elder.times).map(([k, v]) => `${t(lang, `time.${k}` as StringKey)} ${v}`).join(' · ')}
          </AppText>
        </Section>
      )}

      {SLOTS.map((slot) =>
        bySlot[slot].length ? (
          <Section key={slot} title={t(lang, `slot.${slot}` as StringKey)} lang={lang}>
            {bySlot[slot].map((p) => (
              <View key={p.item.id} style={styles.row}>
                {p.profile && (
                  <Backdrop radius={8} pad={2}>
                    <PillGraphic spec={p.profile.spec} size={56} />
                  </Backdrop>
                )}
                <View style={styles.flex}>
                  <AppText lang="en" size={16} bold>{[p.medicine.name, p.medicine.strength].filter(Boolean).join(' ')}</AppText>
                  <AppText lang={lang} size={15}>
                    {p.medicine.purpose[lang]} · {countText(lang, p.item.count)} · {t(lang, `meal.${p.item.meal}`)}
                  </AppText>
                  {p.profile && <AppText lang={lang} size={14} color={theme.textMuted}>{pillWords(lang, p.profile.spec)}</AppText>}
                </View>
              </View>
            ))}
          </Section>
        ) : null,
      )}

      <Section title={t(lang, 'approve.who')} lang={lang}>
        <AppText lang={lang} size={16}>{t(lang, 'approve.calibratedBy', { name: nameOf(cal.calibratedBy) })}</AppText>
        <ChipRow label={t(lang, 'approve.who')}>
          {people.map((p) => (
            <Chip key={p.id} lang={lang} label={p.name} selected={who === p.id} onPress={() => setWho(p.id)} />
          ))}
        </ChipRow>
      </Section>
      {!!msg && <AppText lang={lang} size={16} color={theme.missed} accessibilityLiveRegion="polite">{msg}</AppText>}
      <FamilyButton lang={lang} primary label={t(lang, 'approve.button')} onPress={doApprove} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
