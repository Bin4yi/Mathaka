import { pillWords } from '@mathaka/core';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SIZE } from '../../../a11y/tokens';
import { useTheme } from '../../../a11y/useTheme';
import { AppText } from '../../../components/AppText';
import { ElderButton } from '../../../components/elder/ElderButton';
import { ElderScreen } from '../../../components/elder/ElderScreen';
import { countText, pillLabel } from '../../../components/elder/SlotPillCard';
import { PillGraphic } from '../../../components/PillGraphic';
import { useElderView } from '../../../hooks/useElderView';
import { t } from '../../../i18n';

/** One pill, as big as the screen allows, with its real photo and words. */
export default function PillFullScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const { view } = useElderView();
  if (!view) return null;
  const lang = view.ctx.lang;
  const pill = Object.values(view.bySlot).flat().find((p) => p.item.id === id);

  return (
    <ElderScreen
      lang={lang}
      now={view.now}
      actions={<ElderButton lang={lang} variant="secondary" label={t(lang, 'elder.btn.back')} onPress={() => router.back()} />}
    >
      {pill?.profile && (
        <View style={styles.center} accessible accessibilityLabel={pillLabel(lang, pill)}>
          <PillGraphic spec={pill.profile.spec} size={Math.min(width - 48, 420)} />
          {pill.profile.photoPaths[0] && (
            <Image accessibilityIgnoresInvertColors source={{ uri: pill.profile.photoPaths[0] }} style={styles.photo} resizeMode="contain" />
          )}
          <AppText lang={lang} size={SIZE.elderMain} bold>
            {countText(lang, pill.item.count)}
          </AppText>
          <AppText lang={lang} size={SIZE.elderText}>
            {pill.medicine.purpose[lang]}
          </AppText>
          <AppText lang={lang} size={SIZE.elderText} color={theme.textMuted}>
            {pillWords(lang, pill.profile.spec)}
          </AppText>
        </View>
      )}
    </ElderScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 8 },
  photo: { width: 280, height: 280, borderRadius: SIZE.radius },
});
