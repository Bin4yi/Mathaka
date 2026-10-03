import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { SIZE } from '../a11y/tokens';
import { useTheme } from '../a11y/useTheme';
import { neuShadow } from '../ui/surfaces';

type Props = {
  label: string;
  hint?: string;
  onPress: () => void;
  children: ReactNode;
  style?: ViewStyle;
};

/**
 * Whole card is the touch target. Pressable fires on release, so a shaky press
 * can slide off to cancel.
 */
export function BigCard({ label, hint, onPress, children, style }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.name === 'highContrast' ? theme.border : theme.outline,
          boxShadow: neuShadow(theme, pressed ? 4 : 10, pressed),
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: SIZE.mainTarget,
    borderWidth: 2,
    borderRadius: SIZE.radius,
    padding: SIZE.gap,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE.gap,
  },
});
