import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import { Image, Linking, Platform, StyleSheet } from 'react-native';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../../components/AppText';
import { FamilyButton } from '../../components/family/FamilyUI';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { useAppStore } from '../../store/appStore';

// Made by `npm run mat` (tools/make-mat.ts) from the same layout the pipeline measures with.
const MAT_PNG = require('../../../assets/mat/calibration-mat.png');
const MAT_PDF = require('../../../assets/mat/calibration-mat.pdf');

export default function MatScreen() {
  const lang = useAppStore((s) => s.uiLang);
  const theme = useTheme();

  const share = async () => {
    const asset = Asset.fromModule(MAT_PDF);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
      await Linking.openURL(uri);
      return;
    }
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: t(lang, 'mat.title'), UTI: 'com.adobe.pdf' });
  };

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'mat.title')}
      </AppText>
      <AppText lang={lang} size={16} color={theme.textMuted}>{t(lang, 'mat.hint')}</AppText>
      <Image accessibilityIgnoresInvertColors source={MAT_PNG} style={styles.mat} resizeMode="contain" accessibilityLabel={t(lang, 'mat.title')} />
      <FamilyButton lang={lang} primary label={Platform.OS === 'web' ? t(lang, 'mat.web') : t(lang, 'mat.share')} onPress={share} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mat: { width: '100%', aspectRatio: 148 / 105, backgroundColor: '#FFFFFF', borderRadius: 8 },
});
