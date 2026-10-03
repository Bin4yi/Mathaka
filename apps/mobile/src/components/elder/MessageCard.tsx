import type { Lang } from '@mathaka/core';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Assets } from '../../../assets/generated';
import { useTapGuard } from '../../a11y/hooks';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { t } from '../../i18n';
import { speak } from '../../services/speech';
import { useAppStore } from '../../store/appStore';
import { AppText } from '../AppText';
import { Icon } from '../Icon';
import { NeuCard, neuShadow } from '../../ui/surfaces';

type Props = {
  lang: Lang;
  text: string;
  /** Speak once when shown. */
  autoSpeak?: boolean;
  /** e.g. the family member's photo next to "I will ask Nimal" */
  picture?: ImageSourcePropType;
};

/**
 * The main message of an elder screen. Everything spoken is also written here,
 * and there is always a "Say it again" button.
 */
export function MessageCard({ lang, text, autoSpeak, picture }: Props) {
  const theme = useTheme();
  // evening calm mode speaks a little slower
  const rate = useAppStore((s) => (s.calmActive ? s.speechRate * 0.85 : s.speechRate));
  const sayAgain = useTapGuard(() => speak(text, lang, rate));

  useEffect(() => {
    if (autoSpeak && text) void speak(text, lang, rate);
  }, [autoSpeak, text, lang, rate]);

  return (
    <NeuCard outlined style={styles.card} depth={10}>
      <View style={styles.row}>
        {picture && <Icon source={picture} size={88} />}
        <AppText lang={lang} size={SIZE.elderMain} bold accessibilityLiveRegion="polite" style={styles.flex}>
          {text}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(lang, 'elder.btn.sayAgain')}
        onPress={sayAgain}
        style={({ pressed }) => [
          styles.say,
          {
            backgroundColor: theme.surface,
            boxShadow: neuShadow(theme, 5, pressed),
            borderWidth: theme.name === 'highContrast' ? 2 : 0,
            borderColor: theme.border,
          },
        ]}
      >
        <Icon source={Assets.icons.speaker} size={44} />
        <AppText lang={lang} size={SIZE.elderSmall} bold>
          {t(lang, 'elder.btn.sayAgain')}
        </AppText>
      </Pressable>
    </NeuCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: SIZE.gap + 4, gap: SIZE.gap },
  row: { flexDirection: 'row', alignItems: 'center', gap: SIZE.gap },
  flex: { flex: 1 },
  say: {
    minHeight: SIZE.target,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: SIZE.radius,
    paddingHorizontal: SIZE.gap,
    alignSelf: 'flex-start',
  },
});
