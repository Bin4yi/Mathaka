import { dateKey, pillsBySlot, SLOTS, takenEvent } from '@mathaka/core';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Assets } from '../../../assets/generated';
import { SIZE, SLOT_COLORS } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../../components/AppText';
import { PillImage } from '../../components/PillImage';
import { Screen } from '../../components/Screen';
import { getRepository } from '../../db/bootstrap';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n';
import { clock } from '../../services/clock';

const SLOT_ICON = {
  morning: Assets.icons.timeMorning,
  noon: Assets.icons.timeNoon,
  evening: Assets.icons.timeEvening,
  night: Assets.icons.timeNight,
} as const;

/**
 * M1 elder home: proves the data path (repository -> screen) with demo data.
 * M2 replaces it with the real elder flow (orientation strip, clock, dose screen, big buttons).
 */
export default function ElderHome() {
  const theme = useTheme();
  const { data } = useLoad(async () => {
    const repo = await getRepository();
    const today = dateKey(clock.now());
    const [elder, schedule, medicines, profiles, events] = await Promise.all([
      repo.getElder(),
      repo.listSchedule(),
      repo.listMedicines(),
      repo.listPillProfiles(),
      repo.listDoseEvents(today, today),
    ]);
    return { elder, today, events, bySlot: pillsBySlot(schedule, medicines, profiles) };
  });

  if (!data?.elder) return <Screen>{null}</Screen>;
  const { elder, today, events, bySlot } = data;
  const lang = elder.language;

  return (
    <Screen>
      <View style={styles.header}>
        {/* Hidden family entrance: 3-second press on the logo. Elder mode never shows how to exit. */}
        <Pressable
          delayLongPress={3000}
          onLongPress={() => router.push('/family')}
          accessibilityRole="image"
          accessibilityLabel={t(lang, 'app.name')}
          accessibilityHint={t(lang, 'elder.logoHint')}
        >
          <Image source={Assets.brand.logo} style={styles.logo} />
        </Pressable>
        <AppText lang={lang} size={SIZE.elderMain} bold accessibilityRole="header" style={styles.flex}>
          {t(lang, 'elder.hello', { name: elder.preferredName })}
        </AppText>
      </View>

      <AppText lang={lang} size={SIZE.elderText} bold>{t(lang, 'elder.today')}</AppText>

      {SLOTS.map((slot) => {
        const taken = takenEvent(events, today, slot);
        const pills = bySlot[slot];
        const total = pills.reduce((n, p) => n + p.item.count, 0);
        return (
          <View
            key={slot}
            style={[styles.slot, { borderColor: theme.border, backgroundColor: theme.surface }]}
            accessible
            accessibilityLabel={`${t(lang, `slot.${slot}`)}. ${taken ? t(lang, 'elder.taken') : t(lang, 'elder.notYet')}`}
          >
            <View style={[styles.slotBar, { backgroundColor: SLOT_COLORS[slot] }]} />
            <View style={styles.slotBody}>
              <View style={styles.row}>
                <Image source={SLOT_ICON[slot]} style={styles.slotIcon} />
                <AppText lang={lang} size={SIZE.elderText} bold>{t(lang, `slot.${slot}`)}</AppText>
              </View>
              <View style={styles.pills}>
                {pills.map((p) => (
                  <PillImage key={p.item.id} assetKey={p.profile?.assetKey} size={72} />
                ))}
              </View>
              <AppText lang={lang} size={SIZE.elderText} color={taken ? theme.taken : theme.textMuted}>
                {total === 1 ? t(lang, 'elder.tablet') : t(lang, 'elder.tablets', { n: total })}
                {' · '}
                {taken ? t(lang, 'elder.taken') : t(lang, 'elder.notYet')}
              </AppText>
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SIZE.gap },
  logo: { width: 72, height: 72 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  slot: { flexDirection: 'row', borderWidth: 3, borderRadius: SIZE.radius, overflow: 'hidden' },
  slotBar: { width: 16 },
  slotBody: { flex: 1, padding: 12, gap: 4 },
  slotIcon: { width: 56, height: 56 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingVertical: 4 },
});
