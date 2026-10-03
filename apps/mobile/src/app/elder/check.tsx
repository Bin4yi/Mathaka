import { analyzePillPhoto, elderText, synthPhoto } from '@mathaka/core';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Assets } from '../../../assets/generated';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../../components/AppText';
import { ElderButton } from '../../components/elder/ElderButton';
import { ElderScreen } from '../../components/elder/ElderScreen';
import { MessageCard } from '../../components/elder/MessageCard';
import { DEMO_MODE } from '../../config';
import { useElderView } from '../../hooks/useElderView';
import { t } from '../../i18n';
import { analyzePhoto } from '../../services/calibrationService';
import { checkShownPill } from '../../services/pillCheck';
import { takePhoto } from '../../services/photos';
import { useAppStore } from '../../store/appStore';
import { NeuCard } from '../../ui/surfaces';

/** "Check my pill": one pill on the mat, a big guide frame, one big button. */
export default function CheckScreen() {
  const { view } = useElderView();
  const theme = useTheme();
  const cam = useRef<CameraView>(null);
  const [perm, requestPerm] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  if (!view) return null;
  const lang = view.ctx.lang;
  const slot = view.open?.slot ?? null;
  const web = Platform.OS === 'web';

  const finish = async (features: Parameters<typeof checkShownPill>[0]) => {
    const out = await checkShownPill(features, slot);
    useAppStore.getState().setElderMessage(out.message);
    router.replace('/elder/answer');
  };

  const shoot = async () => {
    setBusy(true);
    try {
      if (web) {
        // web preview: a file, or (demo) a sample photo of this slot's first pill
        const first = slot ? view.bySlot[slot][0]?.profile?.spec : undefined;
        if (DEMO_MODE && first) {
          await finish(analyzePillPhoto(synthPhoto(first, { width: 640, height: 480, seed: 21, rotateDeg: 8, tilt: 0.06, light: [1.06, 1, 0.9] })).features);
          return;
        }
        const p = await takePhoto('library');
        if (p) await finish((await analyzePhoto(p)).analysis.features);
        return;
      }
      const pic = await cam.current?.takePictureAsync({ quality: 0.85, skipProcessing: true });
      if (!pic) return;
      const a = await analyzePhoto({ uri: pic.uri, width: pic.width, height: pic.height });
      // dark photo: turn the torch on for the next try (auto torch in low light)
      if (a.analysis.warnings.includes('too_dark')) setTorch(true);
      await finish(a.analysis.features);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ElderScreen
      lang={lang}
      now={view.now}
      actions={
        <>
          {busy ? (
            <View style={styles.busy} accessibilityLiveRegion="polite">
              <ActivityIndicator size="large" />
              <AppText lang={lang} size={SIZE.elderText} bold>
                {t(lang, 'check.looking')}
              </AppText>
            </View>
          ) : (
            <ElderButton lang={lang} label={t(lang, 'elder.btn.photo')} icon={Assets.icons.checkPhoto} onPress={shoot} testID="check-shoot" />
          )}
          <ElderButton lang={lang} variant="secondary" label={t(lang, 'elder.btn.back')} onPress={() => router.back()} />
        </>
      }
    >
      <MessageCard lang={lang} text={elderText(view.ctx, 'check.prompt')} autoSpeak />
      {!web && (
        <NeuCard outlined style={styles.camCard}>
          {perm?.granted ? (
            <View style={styles.camWrap}>
              <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} />
              {/* big guide frame: put the mat inside */}
              <View pointerEvents="none" style={[styles.guide, { borderColor: theme.focus }]} />
            </View>
          ) : (
            <ElderButton lang={lang} variant="secondary" label={t(lang, 'sync.camera')} onPress={() => void requestPerm()} />
          )}
        </NeuCard>
      )}
    </ElderScreen>
  );
}

const styles = StyleSheet.create({
  camCard: { padding: 10 },
  camWrap: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18, overflow: 'hidden' },
  guide: { position: 'absolute', left: '8%', right: '8%', top: '12%', bottom: '12%', borderWidth: 6, borderRadius: 18, borderStyle: 'dashed' },
  busy: { minHeight: SIZE.mainTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
});
