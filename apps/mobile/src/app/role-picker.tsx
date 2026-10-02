import { LANGS, type DeviceRole } from '@mathaka/core';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Assets } from '../../assets/generated';
import { SIZE } from '../a11y/tokens';
import { useTheme } from '../a11y/useTheme';
import { AppText } from '../components/AppText';
import { BigCard } from '../components/BigCard';
import { Screen } from '../components/Screen';
import { LANG_NAMES, t } from '../i18n';
import { saveRole, saveUiLang } from '../services/settings';
import { useAppStore } from '../store/appStore';

export default function RolePicker() {
  const lang = useAppStore((s) => s.uiLang);
  const theme = useTheme();

  const pick = async (role: DeviceRole) => {
    await saveRole(role);
    router.replace(role === 'elder' ? '/elder' : '/family');
  };

  return (
    <Screen>
      <View style={styles.logoRow}>
        <Image source={Assets.brand.logo} style={styles.logo} accessibilityIgnoresInvertColors />
        <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
          {t(lang, 'app.name')}
        </AppText>
      </View>

      <View style={styles.langRow} accessibilityRole="radiogroup" accessibilityLabel={t(lang, 'common.language')}>
        {LANGS.map((l) => (
          <Pressable
            key={l}
            accessibilityRole="radio"
            accessibilityState={{ selected: l === lang }}
            accessibilityLabel={LANG_NAMES[l]}
            onPress={() => void saveUiLang(l)}
            style={[
              styles.chip,
              { borderColor: theme.border, backgroundColor: l === lang ? theme.primary : theme.surface },
            ]}
          >
            <AppText lang={l} size={20} bold color={l === lang ? theme.onPrimary : theme.text}>
              {LANG_NAMES[l]}
            </AppText>
          </Pressable>
        ))}
      </View>

      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'role.title')}
      </AppText>

      <BigCard label={t(lang, 'role.family')} hint={t(lang, 'role.familyHint')} onPress={() => void pick('family')}>
        <Image source={Assets.icons.family} style={styles.icon} accessibilityElementsHidden importantForAccessibility="no" />
        <View style={styles.flex}>
          <AppText lang={lang} size={22} bold>{t(lang, 'role.family')}</AppText>
          <AppText lang={lang} size={18} color={theme.textMuted}>{t(lang, 'role.familyHint')}</AppText>
        </View>
      </BigCard>

      <BigCard label={t(lang, 'role.elder')} hint={t(lang, 'role.elderHint')} onPress={() => void pick('elder')}>
        <Image source={Assets.icons.elder} style={styles.icon} accessibilityElementsHidden importantForAccessibility="no" />
        <View style={styles.flex}>
          <AppText lang={lang} size={22} bold>{t(lang, 'role.elder')}</AppText>
          <AppText lang={lang} size={18} color={theme.textMuted}>{t(lang, 'role.elderHint')}</AppText>
        </View>
      </BigCard>

      <AppText lang={lang} size={16} color={theme.textMuted}>{t(lang, 'role.later')}</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 64, height: 64 },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: {
    minHeight: 56,
    minWidth: 96,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 72, height: 72 },
});
