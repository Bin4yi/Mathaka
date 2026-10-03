import { analyzePillPhoto, combinePhotos, decisionWording, matchPill, synthPhoto, type PillSpec } from '@mathaka/core';
import * as Device from 'expo-device';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { getAi } from '../../ai';
import { AppText } from '../../components/AppText';
import { FamilyButton, Section } from '../../components/family/FamilyUI';
import { Screen } from '../../components/Screen';
import { t } from '../../i18n';
import { useAppStore } from '../../store/appStore';

// On-phone benchmark: screenshot this on a new phone and on an old one for the report.

const PHRASES = ['mama beheth biwwada?', 'ilaga beheth kiyatada', 'Did I take my tablets?', 'මම බෙහෙත් බිව්වද?', 'When is my next medicine?'];
const SPECS: PillSpec[] = [
  { shape: 'oblong', colorA: 'white', score: true, sizeMm: { length: 19, width: 9 } },
  { shape: 'round', colorA: 'pink', sizeMm: { length: 7, width: 7 } },
  { shape: 'oval', colorA: 'yellow', sizeMm: { length: 10, width: 6 } },
  { shape: 'capsule', colorA: 'red', colorB: 'white', split: 'vertical', sizeMm: { length: 18, width: 6 } },
  { shape: 'diamond', colorA: 'blue', sizeMm: { length: 9, width: 9 } },
];

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const yieldUi = () => new Promise((r) => setTimeout(r, 0));

function jsHeapMb(): number | null {
  const h = (globalThis as { HermesInternal?: { getInstrumentedStats?: () => Record<string, number> } }).HermesInternal;
  const stats = h?.getInstrumentedStats?.();
  const bytes = stats?.js_heapSize ?? stats?.js_allocatedBytes;
  if (bytes) return Math.round(bytes / 1e6);
  const perf = (globalThis as { performance?: { memory?: { usedJSHeapSize?: number } } }).performance;
  return perf?.memory?.usedJSHeapSize ? Math.round(perf.memory.usedJSHeapSize / 1e6) : null;
}

type Result = { dec: number[]; pills: number[]; ok: number; engine: string; mem: number | null };

export default function BenchScreen() {
  const lang = useAppStore((s) => s.uiLang);
  const theme = useTheme();
  const [progress, setProgress] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);

  const run = async () => {
    const ai = getAi();
    const dec: number[] = [];
    for (let i = 0; i < 50; i++) {
      const w = decisionWording('intent', PHRASES[i % PHRASES.length]!);
      const t0 = Date.now();
      await ai.decisions.choose(w.state, w.question, Object.keys(w.options));
      dec.push(Date.now() - t0);
      if (i % 5 === 0) {
        setProgress(t(lang, 'bench.running', { done: i, total: 60 }));
        await yieldUi();
      }
    }
    // calibrate each spec once, then 10 checks with new light/angle
    const cal = SPECS.map((s, i) => ({ id: String(i), look: combinePhotos([analyzePillPhoto(synthPhoto(s, { width: 640, height: 480, seed: i + 1 })).features!])!.look }));
    const pills: number[] = [];
    let ok = 0;
    for (let i = 0; i < 10; i++) {
      setProgress(t(lang, 'bench.running', { done: 50 + i, total: 60 }));
      await yieldUi();
      const img = synthPhoto(SPECS[i % SPECS.length]!, { width: 800, height: 600, seed: 40 + i, rotateDeg: 9, tilt: 0.08, light: [1.08, 1, 0.85] });
      const t0 = Date.now();
      const f = analyzePillPhoto(img).features;
      const m = f ? matchPill(f, cal) : null;
      pills.push(Date.now() - t0);
      if (m?.kind === 'match' && m.id === String(i % SPECS.length)) ok++;
    }
    setProgress(null);
    setRes({ dec, pills, ok, engine: ai.decisions.name, mem: jsHeapMb() });
  };

  const ram = Device.totalMemory ? (Device.totalMemory / 1024 ** 3).toFixed(1) : '?';
  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'bench.title')}
      </AppText>
      <AppText lang={lang} size={15} color={theme.textMuted}>{t(lang, 'bench.hint')}</AppText>
      <Section title={t(lang, 'bench.device', { model: Device.modelName ?? Platform.OS, ram, os: Device.osVersion ?? '?' })} lang={lang}>
        {progress ? (
          <AppText lang={lang} size={17} accessibilityLiveRegion="polite">{progress}</AppText>
        ) : (
          <FamilyButton lang={lang} primary label={t(lang, 'bench.run')} onPress={run} />
        )}
        {res && (
          <View style={styles.res} accessibilityLiveRegion="polite">
            <AppText lang={lang} size={17}>{t(lang, 'bench.decisions', { engine: res.engine, med: median(res.dec), max: Math.max(...res.dec) })}</AppText>
            <AppText lang={lang} size={17}>{t(lang, 'bench.pills', { med: median(res.pills), max: Math.max(...res.pills), ok: res.ok })}</AppText>
            <AppText lang={lang} size={17}>{res.mem !== null ? t(lang, 'bench.memory', { mb: res.mem }) : t(lang, 'bench.noMemory')}</AppText>
          </View>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  res: { gap: 8 },
});
