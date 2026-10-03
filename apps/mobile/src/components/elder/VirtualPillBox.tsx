import type { Lang, Slot, SlotState } from '@mathaka/core';
import { Image, StyleSheet, View } from 'react-native';
import { Assets } from '../../../assets/generated';
import { SIZE, SLOT_COLORS } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { t, type StringKey } from '../../i18n';
import { AppText } from '../AppText';
import { Icon } from '../Icon';
import { NeuCard, neuShadow } from '../../ui/surfaces';

export const SLOT_ICON: Record<Slot, number> = {
  morning: Assets.icons.timeMorning,
  noon: Assets.icons.timeNoon,
  evening: Assets.icons.timeEvening,
  night: Assets.icons.timeNight,
};

/**
 * On-screen pill box (same idea as the optional BLE box): only the slot for now is lit.
 * Colour is never alone: every compartment also has an icon and a word.
 * API note: a real box (M9) gets `lit` and can later add a lock per slot.
 */
export function VirtualPillBox({ lang, states, lit }: { lang: Lang; states: SlotState[]; lit: Slot | null }) {
  const theme = useTheme();
  return (
    <NeuCard inset outlined radius={28} style={styles.box}>
      <View style={styles.boxInner} accessibilityLabel={t(lang, 'elder.box')}>
      {states.map((s) => {
        const isLit = s.slot === lit;
        const done = s.status === 'taken';
        const word = t(lang, `slot.${s.slot}` as StringKey);
        const label = t(lang, isLit ? 'elder.boxNow' : done ? 'elder.boxDone' : 'elder.boxLater', { slot: word });
        return (
          <View
            key={s.slot}
            accessible
            accessibilityLabel={label}
            style={[
              styles.cell,
              {
                backgroundColor: theme.surface,
                borderColor: isLit ? theme.focus : theme.outline,
                borderWidth: isLit ? 5 : theme.name === 'highContrast' ? 2 : 1,
                opacity: isLit || done ? 1 : theme.dim,
                // the lit slot glows; the others sit flat
                boxShadow: isLit && theme.name !== 'highContrast' ? `0px 0px 22px ${theme.focus}, ${neuShadow(theme, 6)}` : neuShadow(theme, 4),
                transform: [{ translateY: isLit ? -4 : 0 }],
              },
            ]}
          >
            <View style={[styles.lid, { backgroundColor: SLOT_COLORS[s.slot] }]} />
            <View style={styles.icon}>
              <Icon source={SLOT_ICON[s.slot]} size={44} />
            </View>
            <AppText lang={lang} size={SIZE.elderSmall} bold style={styles.word}>
              {word}
            </AppText>
            {done && (
              <Image accessibilityIgnoresInvertColors source={Assets.icons.statusTaken} style={styles.check} accessibilityElementsHidden importantForAccessibility="no" />
            )}
          </View>
        );
      })}
      </View>
    </NeuCard>
  );
}

const styles = StyleSheet.create({
  box: { padding: 12 },
  boxInner: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 6 },
  cell: { flexGrow: 1, flexBasis: 72, minHeight: 124, borderRadius: 18, alignItems: 'center', overflow: 'hidden', paddingBottom: 8 },
  lid: { alignSelf: 'stretch', height: 16 },
  icon: { marginTop: 6 },
  word: { textAlign: 'center' },
  check: { width: 32, height: 32, position: 'absolute', top: 20, right: 4 },
});
