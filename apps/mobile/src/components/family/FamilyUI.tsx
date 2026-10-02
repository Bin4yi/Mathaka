import type { Lang } from '@mathaka/core';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
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

/** Text input with a visible label (and the same label for TalkBack). */
export function Field({
  lang,
  label,
  value,
  onChange,
  keyboard = 'default',
  placeholder,
}: {
  lang: Lang;
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: 'default' | 'numeric' | 'phone-pad' | 'numbers-and-punctuation';
  placeholder?: string;
}) {
  const theme = useTheme();
  return (
    <View style={fieldStyles.field}>
      <AppText lang={lang} size={16} bold>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        accessibilityLabel={label}
        style={[fieldStyles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
      />
    </View>
  );
}

/** Small coloured dot + word chip for pill colours (colour is never shown alone). */
export function ColorChip({ lang, label, color, selected, onPress }: { lang: Lang; label: string; color: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        fieldStyles.colorChip,
        { borderColor: theme.border, backgroundColor: selected ? theme.primary : theme.surface, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[fieldStyles.swatch, { backgroundColor: color, borderColor: '#22283A' }]} />
      <AppText lang={lang} size={16} bold color={selected ? theme.onPrimary : theme.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const fieldStyles = StyleSheet.create({
  field: { gap: 6 },
  input: { minHeight: 52, borderWidth: 2, borderRadius: 12, fontSize: 18, paddingHorizontal: 12 },
  colorChip: { flexDirection: 'row', gap: 8 },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
});
