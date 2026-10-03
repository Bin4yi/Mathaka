import type { Lang } from '@mathaka/core';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Platform, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useTapGuard } from '../../a11y/hooks';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { neuShadow } from '../../ui/surfaces';
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
 * Looks: soft raised pill; the main one is a deep teal gradient (text >= 7:1 on both stops).
 */
export function ElderButton({ lang, label, hint, icon, variant = 'primary', onPress, testID }: Props) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const hc = theme.name === 'highContrast';
  const guarded = useTapGuard(async () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onPress();
  });

  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} onPress={guarded}>
      {({ pressed }) => (
        <View
          style={[
            styles.button,
            {
              backgroundColor: primary ? theme.primary : theme.surface,
              borderColor: hc ? theme.border : primary ? 'transparent' : theme.outline,
              borderWidth: hc ? 3 : primary ? 0 : 2,
              boxShadow: neuShadow(theme, pressed ? 4 : 9, pressed && !primary),
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          {primary && !hc && (
            <LinearGradient colors={theme.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} />
          )}
          {icon && (
            <View style={styles.iconWrap}>
              <Image accessibilityIgnoresInvertColors source={icon} style={styles.icon} accessibilityElementsHidden importantForAccessibility="no" />
            </View>
          )}
          <AppText lang={lang} size={SIZE.elderText} bold color={primary ? theme.onPrimary : theme.onSecondary} style={styles.label}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: SIZE.mainTarget,
    borderRadius: 28,
    paddingHorizontal: SIZE.gap,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE.gap,
  },
  iconWrap: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 6, boxShadow: '0px 4px 10px rgba(0,0,0,0.12)' },
  icon: { width: 56, height: 56 },
  label: { flex: 1 },
});
