import { pillWords, type Lang, type SlotPill } from '@mathaka/core';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { t } from '../../i18n';
import { AppText } from '../AppText';
import { Backdrop } from '../Icon';
import { PillGraphic } from '../PillGraphic';

export function countText(lang: Lang, n: number): string {
  return n === 1 ? t(lang, 'elder.tablet') : t(lang, 'elder.tablets', { n });
}

/** Spoken label: "Sugar medicine. pink · round · number 5. 2 tablets." */
export function pillLabel(lang: Lang, p: SlotPill): string {
  const words = p.profile ? pillWords(lang, p.profile.spec) : '';
  return `${p.medicine.purpose[lang]}. ${words}. ${countText(lang, p.item.count)}.`;
}

/** One medicine on the dose screen. The whole card opens the pill full screen. */
export function SlotPillCard({ lang, pill }: { lang: Lang; pill: SlotPill }) {
  const theme = useTheme();
  const spec = pill.profile?.spec;
  const photo = pill.profile?.photoPaths[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pillLabel(lang, pill)}
      accessibilityHint={t(lang, 'elder.pillHint')}
      onPress={() => router.push({ pathname: '/elder/pill/[id]', params: { id: pill.item.id } })}
      style={({ pressed }) => [styles.card, { borderColor: theme.border, backgroundColor: theme.surface, opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={styles.pictures}>
        {spec && (
          <Backdrop radius={SIZE.radius} pad={8}>
            <PillGraphic spec={spec} size={SIZE.pill} />
          </Backdrop>
        )}
        {photo && <Image accessibilityIgnoresInvertColors source={{ uri: photo }} style={styles.photo} accessibilityElementsHidden importantForAccessibility="no" />}
      </View>
      <AppText lang={lang} size={SIZE.elderMain} bold>
        {countText(lang, pill.item.count)}
      </AppText>
      <AppText lang={lang} size={SIZE.elderText}>
        {pill.medicine.purpose[lang]}
      </AppText>
      {spec && (
        <AppText lang={lang} size={SIZE.elderSmall} color={theme.textMuted}>
          {pillWords(lang, spec)}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 3, borderRadius: SIZE.radius, padding: SIZE.gap, alignItems: 'center', gap: 4 },
  pictures: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  photo: { width: 96, height: 96, borderRadius: 12 },
});
