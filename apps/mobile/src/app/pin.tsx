import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SIZE } from '../a11y/tokens';
import { useTheme } from '../a11y/useTheme';
import { AppText } from '../components/AppText';
import { Screen } from '../components/Screen';
import { DEMO_MODE } from '../config';
import { t } from '../i18n';
import { checkPin } from '../services/settings';
import { useAppStore } from '../store/appStore';
import { neuShadow } from '../ui/surfaces';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'del'] as const;

/** Family PIN pad. Reached from the elder phone by holding the logo for 3 seconds. */
export default function PinScreen() {
  const lang = useAppStore((s) => s.uiLang);
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);

  const press = async (k: (typeof KEYS)[number]) => {
    if (k === 'back') return router.back();
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, 4);
    setPin(next);
    setWrong(false);
    if (next.length === 4) {
      if (await checkPin(next)) router.replace('/family');
      else {
        setWrong(true);
        setPin('');
      }
    }
  };

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'pin.title')}
      </AppText>
      <AppText lang={lang} size={SIZE.familyText}>
        {t(lang, 'pin.hint')}
      </AppText>
      {DEMO_MODE && (
        <AppText lang={lang} size={SIZE.familyText} color={theme.textMuted}>
          {t(lang, 'pin.demoHint')}
        </AppText>
      )}
      <View style={styles.dots} accessible accessibilityLabel={`${pin.length} / 4`}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, { borderColor: theme.border, backgroundColor: i < pin.length ? theme.text : 'transparent' }]} />
        ))}
      </View>
      {wrong && (
        <AppText lang={lang} size={SIZE.familyText} color={theme.missed} accessibilityLiveRegion="polite">
          {t(lang, 'pin.wrong')}
        </AppText>
      )}
      <View style={styles.pad}>
        {KEYS.map((k) => {
          const label = k === 'back' ? t(lang, 'pin.cancel') : k === 'del' ? t(lang, 'pin.delete') : k;
          return (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityLabel={k.length === 1 ? t(lang, 'pin.digit', { d: k }) : label}
              onPress={() => void press(k)}
              style={({ pressed }) => [
                styles.key,
                { borderColor: theme.border, borderWidth: theme.name === 'highContrast' ? 2 : 0, backgroundColor: theme.surface, boxShadow: neuShadow(theme, 7, pressed) },
              ]}
            >
              <AppText lang={k.length === 1 ? 'en' : lang} size={k.length === 1 ? 32 : 18} bold>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 16, alignSelf: 'center', marginVertical: 8 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 3 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.gap + 6, justifyContent: 'center', maxWidth: 360, alignSelf: 'center' },
  key: { width: 96, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
});
