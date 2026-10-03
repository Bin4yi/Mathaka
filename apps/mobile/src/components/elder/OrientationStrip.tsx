import type { Lang } from '@mathaka/core';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Assets } from '../../../assets/generated';
import { SIZE } from '../../a11y/tokens';
import { t, type StringKey } from '../../i18n';
import { AppText } from '../AppText';
import { Icon } from '../Icon';
import { GlassPanel } from '../../ui/surfaces';

type Part = 'morning' | 'noon' | 'evening' | 'night';

export function partOfDay(d: Date): Part {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 16) return 'noon';
  if (h >= 16 && h < 19) return 'evening';
  return 'night';
}

const PART_ICON = {
  morning: Assets.icons.timeMorning,
  noon: Assets.icons.timeNoon,
  evening: Assets.icons.timeEvening,
  night: Assets.icons.timeNight,
} as const;

/**
 * Top of every elder screen: big day name + part of day + picture ("Friday · Morning").
 * Helps people who lose track of time. The logo is the hidden family entrance
 * (press and hold 3 seconds); elder mode never shows how to exit.
 */
export function OrientationStrip({ lang, now }: { lang: Lang; now: Date }) {
  const part = partOfDay(now);
  const day = t(lang, `day.${now.getDay()}` as StringKey);
  const partWord = t(lang, `part.${part}` as StringKey);

  return (
    <GlassPanel outlined style={styles.strip}>
      <Pressable
        delayLongPress={3000}
        onLongPress={() => router.push('/pin')}
        accessibilityRole="image"
        accessibilityLabel={t(lang, 'app.name')}
        accessibilityHint={t(lang, 'elder.logoHint')}
        hitSlop={8}
      >
        <Image accessibilityIgnoresInvertColors source={Assets.brand.logo} style={styles.logo} />
      </Pressable>
      <View style={styles.flex} accessible accessibilityRole="header" accessibilityLabel={`${day}. ${partWord}.`}>
        <AppText lang={lang} size={SIZE.elderText} bold>
          {day}
        </AppText>
        <AppText lang={lang} size={SIZE.elderText}>
          {partWord}
        </AppText>
      </View>
      <Icon source={PART_ICON[part]} size={64} />
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  flex: { flex: 1 },
  logo: { width: 56, height: 56 },
});
