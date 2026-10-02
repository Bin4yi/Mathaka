import type { Lang } from '@mathaka/core';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../AppText';

// Small building blocks for family / Memory Buddy screens (one-handed, labelled, big chips).

export function Section({ title, lang, children }: { title: string; lang: Lang; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <AppText lang={lang} size={20} bold accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

export function FamilyButton({
  lang,
  label,
  onPress,
  primary,
}: {
  lang: Lang;
  label: string;
  onPress: () => void | Promise<void>;
  primary?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => void onPress()}
      style={({ pressed }) => [
        styles.button,
        { borderColor: theme.border, backgroundColor: primary ? theme.primary : theme.surface, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <AppText lang={lang} size={SIZE.familyText} bold color={primary ? theme.onPrimary : theme.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Big selectable chip (instead of small dropdowns). */
export function Chip({ lang, label, selected, onPress }: { lang: Lang; label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: theme.border, backgroundColor: selected ? theme.primary : theme.surface, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <AppText lang={lang} size={17} bold color={selected ? theme.onPrimary : theme.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ChipRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View style={styles.chipRow} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: 2, borderRadius: SIZE.radius, padding: SIZE.gap, gap: 12 },
  button: {
    minHeight: 56,
    borderWidth: 2,
    borderRadius: SIZE.radius,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  chip: {
    minHeight: 52,
    minWidth: 72,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
