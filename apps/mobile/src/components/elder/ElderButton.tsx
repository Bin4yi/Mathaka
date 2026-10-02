import type { Lang } from '@mathaka/core';
import * as Haptics from 'expo-haptics';
import { Image, Platform, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useTapGuard } from '../../a11y/hooks';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../AppText';

type Props = {
  lang: Lang;
  label: string;
  hint?: string;
  icon?: ImageSourcePropType;
  variant?: 'primary' | 'secondary';
  onPress: () => void | Promise<void>;
  testID?: string;
};

/**
 * The big elder button: >= 96 dp tall, whole area tappable, acts on release
 * (a shaky press can slide off to cancel), ignores repeat taps for 1.5 s.
 */
export function ElderButton({ lang, label, hint, icon, variant = 'primary', onPress, testID }: Props) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const guarded = useTapGuard(async () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onPress();
  });

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={guarded}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? theme.primary : theme.secondary,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon && (
        <View style={styles.iconWrap}>
          <Image accessibilityIgnoresInvertColors source={icon} style={styles.icon} accessibilityElementsHidden importantForAccessibility="no" />
        </View>
      )}
      <AppText lang={lang} size={SIZE.elderText} bold color={primary ? theme.onPrimary : theme.onSecondary} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: SIZE.mainTarget,
    borderRadius: SIZE.radius,
    borderWidth: 3,
    paddingHorizontal: SIZE.gap,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE.gap,
  },
  iconWrap: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 4 },
  icon: { width: 60, height: 60 },
  label: { flex: 1 },
});
