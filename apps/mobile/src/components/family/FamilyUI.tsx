import type { Lang } from '@mathaka/core';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type ImageSourcePropType } from 'react-native';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { GlassPanel, neuShadow } from '../../ui/surfaces';
import { AppText } from '../AppText';
import { Icon } from '../Icon';

// Building blocks for family / Memory Buddy screens: glass sections, neumorphic controls.
// One-handed, every control labelled, big chips instead of small dropdowns.

export function Section({ title, lang, children, icon }: { title: string; lang: Lang; children: ReactNode; icon?: ImageSourcePropType }) {
  return (
    <GlassPanel blur style={styles.section}>
      <View style={styles.sectionHead}>
        {icon && <Icon source={icon} size={30} />}
        <AppText lang={lang} size={19} bold accessibilityRole="header" style={styles.flex}>
          {title}
        </AppText>
      </View>
      {children}
    </GlassPanel>
  );
}

export function FamilyButton({
  lang,
  label,
  onPress,
  primary,
  icon,
}: {
  lang: Lang;
  label: string;
  onPress: () => void | Promise<void>;
  primary?: boolean;
  icon?: ImageSourcePropType;
}) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => void onPress()}>
      {({ pressed }) => (
        <View
          style={[
            styles.button,
            {
              backgroundColor: primary ? theme.primary : theme.surface,
              boxShadow: neuShadow(theme, pressed ? 4 : 6, pressed && !primary),
              borderWidth: theme.name === 'highContrast' ? 2 : 0,
              borderColor: theme.border,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            },
          ]}
        >
          {primary && theme.name !== 'highContrast' && (
            <LinearGradient colors={theme.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} />
          )}
          {icon && <Icon source={icon} size={28} />}
          <AppText lang={lang} size={SIZE.familyText} bold color={primary ? theme.onPrimary : theme.text} style={styles.buttonLabel}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

/** Big selectable chip. Selected = pressed-in + filled + tick, so it is not colour alone. */
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
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          boxShadow: neuShadow(theme, 5, selected || pressed),
          borderWidth: theme.name === 'highContrast' || selected ? 2 : 0,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
    >
      <AppText lang={lang} size={16} bold color={selected ? theme.onPrimary : theme.text}>
        {selected ? `✓ ${label}` : label}
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

/** Text input with a visible label (and the same label for TalkBack). Inset look. */
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
    <View style={styles.field}>
      <AppText lang={lang} size={15} bold color={theme.textMuted}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        accessibilityLabel={label}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.surface,
            boxShadow: neuShadow(theme, 5, true),
            borderWidth: theme.name === 'highContrast' ? 2 : 0,
            borderColor: theme.border,
          },
        ]}
      />
    </View>
  );
}

/** Colour dot + word chip for pill colours (colour is never shown alone). */
export function ColorChip({ lang, label, color, selected, onPress }: { lang: Lang; label: string; color: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        styles.colorChip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          boxShadow: neuShadow(theme, 5, selected),
          borderWidth: theme.name === 'highContrast' ? 2 : 0,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <AppText lang={lang} size={16} bold color={selected ? theme.onPrimary : theme.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Square neumorphic tile for dashboard quick actions. */
export function ActionTile({ lang, label, icon, onPress }: { lang: Lang; label: string; icon: ImageSourcePropType; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.tileWrap}>
      {({ pressed }) => (
        <View
          style={[
            styles.tile,
            {
              backgroundColor: theme.surface,
              boxShadow: neuShadow(theme, 7, pressed),
              borderWidth: theme.name === 'highContrast' ? 2 : 0,
              borderColor: theme.border,
            },
          ]}
        >
          <Icon source={icon} size={44} />
          <AppText lang={lang} size={15} bold style={styles.tileLabel}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { padding: SIZE.gap + 2, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: {
    minHeight: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonLabel: { textAlign: 'center', flexShrink: 1 },
  chip: { minHeight: 52, minWidth: 72, paddingHorizontal: 16, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 4 },
  field: { gap: 6 },
  input: { minHeight: 54, borderRadius: 16, fontSize: 18, paddingHorizontal: 14 },
  colorChip: { flexDirection: 'row', gap: 8 },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#22283A' },
  tileWrap: { flexBasis: '30%', flexGrow: 1 },
  tile: { minHeight: 112, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 },
  tileLabel: { textAlign: 'center' },
});
