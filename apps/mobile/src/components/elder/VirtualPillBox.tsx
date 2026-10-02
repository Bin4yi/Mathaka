import type { Lang, Slot, SlotState } from '@mathaka/core';
import { Image, StyleSheet, View } from 'react-native';
import { Assets } from '../../../assets/generated';
import { SIZE, SLOT_COLORS } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { t, type StringKey } from '../../i18n';
import { AppText } from '../AppText';
import { Icon } from '../Icon';

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
    <View
      style={[styles.box, { borderColor: theme.border, backgroundColor: theme.surface }]}
      accessibilityLabel={t(lang, 'elder.box')}
    >
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
              { borderColor: isLit ? theme.focus : theme.border, borderWidth: isLit ? 6 : 2, opacity: isLit || done ? 1 : theme.dim },
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
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8, borderWidth: 3, borderRadius: SIZE.radius },
  cell: { flexGrow: 1, flexBasis: 72, minHeight: 120, borderRadius: 14, alignItems: 'center', overflow: 'hidden', paddingBottom: 6 },
  lid: { alignSelf: 'stretch', height: 16 },
  icon: { marginTop: 6 },
  word: { textAlign: 'center' },
  check: { width: 32, height: 32, position: 'absolute', top: 20, right: 4 },
});
