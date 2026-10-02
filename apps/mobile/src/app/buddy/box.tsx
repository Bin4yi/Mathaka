import { pillsBySlot, pillWords, SLOTS } from '@mathaka/core';
import { StyleSheet, View } from 'react-native';
import { SIZE, SLOT_COLORS } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../../components/AppText';
import { countText } from '../../components/elder/SlotPillCard';
import { SLOT_ICON } from '../../components/elder/VirtualPillBox';
import { Section } from '../../components/family/FamilyUI';
import { Backdrop, Icon } from '../../components/Icon';
import { PillGraphic } from '../../components/PillGraphic';
import { Screen } from '../../components/Screen';
import { getRepository } from '../../db/bootstrap';
import { useLoad } from '../../hooks/useLoad';
import { t, type StringKey } from '../../i18n';
import { currentProfiles } from '../../services/calibrationService';
import { useAppStore } from '../../store/appStore';

/** Step 5 (and every weekly refill): what goes in each slot of the pill box. */
export default function BoxPlanScreen() {
  const lang = useAppStore((s) => s.uiLang);
  const theme = useTheme();
  const { data } = useLoad(async () => {
    const repo = await getRepository();
    return pillsBySlot(await repo.listSchedule(), await repo.listMedicines(), await currentProfiles());
  });
  if (!data) return <Screen>{null}</Screen>;

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'box.title')}
      </AppText>
      <AppText lang={lang} size={16} color={theme.textMuted}>{t(lang, 'box.hint')}</AppText>
      {SLOTS.map((slot) => (
        <Section key={slot} title={t(lang, `slot.${slot}` as StringKey)} lang={lang}>
          <View style={[styles.bar, { backgroundColor: SLOT_COLORS[slot] }]} />
          <Icon source={SLOT_ICON[slot]} size={40} />
          {data[slot].length === 0 && <AppText lang={lang} size={16}>{t(lang, 'box.empty')}</AppText>}
          {data[slot].map((p) => (
            <View
              key={p.item.id}
              style={styles.row}
              accessible
              accessibilityLabel={`${p.medicine.name}. ${countText(lang, p.item.count)}. ${p.profile ? pillWords(lang, p.profile.spec) : ''}`}
            >
              <View style={styles.pills}>
                {Array.from({ length: Math.max(1, Math.ceil(p.item.count)) }, (_, k) =>
                  p.profile ? (
                    <Backdrop key={k} radius={8} pad={2}>
                      <PillGraphic spec={p.profile.spec} size={56} />
                    </Backdrop>
                  ) : null,
                )}
              </View>
              <View style={styles.flex}>
                <AppText lang="en" size={17} bold>{p.medicine.name}</AppText>
                <AppText lang={lang} size={16}>{countText(lang, p.item.count)} · {t(lang, `meal.${p.item.meal}`)}</AppText>
              </View>
            </View>
          ))}
        </Section>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { height: 10, borderRadius: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  pills: { flexDirection: 'row', gap: 4 },
});
