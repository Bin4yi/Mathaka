import {
  colorWord,
  PILL_COLORS,
  shapeWord,
  type Medicine,
  type PillColorName,
  type PillShape,
  type PillSpec,
} from '@mathaka/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, View } from 'react-native';
import { SIZE } from '../../../a11y/tokens';
import { useTheme } from '../../../a11y/useTheme';
import { AppText } from '../../../components/AppText';
import { Chip, ChipRow, ColorChip, Field, FamilyButton, Section } from '../../../components/family/FamilyUI';
import { Backdrop } from '../../../components/Icon';
import { PillGraphic } from '../../../components/PillGraphic';
import { Screen } from '../../../components/Screen';
import { DEMO_MODE } from '../../../config';
import { getRepository } from '../../../db/bootstrap';
import { t, type StringKey } from '../../../i18n';
import {
  analyzePhoto,
  combine,
  readImprintAndDescribe,
  samplePhoto,
  savePillProfile,
  type AnalyzedPhoto,
} from '../../../services/calibrationService';
import { takePhoto } from '../../../services/photos';
import { useAppStore } from '../../../store/appStore';

const SHOTS = ['front', 'back', 'light'] as const;
const SHAPES: PillShape[] = ['round', 'oval', 'oblong', 'capsule', 'diamond', 'triangle'];
const COLORS = Object.keys(PILL_COLORS) as PillColorName[];

/** Sample specs for the web demo, matched to the demo medicines (so the test looks real). */
const SAMPLE_SPECS: Record<string, PillSpec> = {
  'm-sugar': { shape: 'oblong', colorA: 'white', score: true, sizeMm: { length: 19, width: 9 } },
  'm-pressure': { shape: 'round', colorA: 'pink', sizeMm: { length: 7, width: 7 } },
  'm-cholesterol': { shape: 'oval', colorA: 'yellow', sizeMm: { length: 10, width: 6 } },
  'm-heart': { shape: 'capsule', colorA: 'red', colorB: 'white', split: 'vertical', sizeMm: { length: 18, width: 6 } },
};
const FALLBACK_SAMPLE: PillSpec = { shape: 'round', colorA: 'orange', score: true, sizeMm: { length: 9, width: 9 } };

/** Step 3: three photos on the mat -> measured look -> the Buddy checks the picture -> save. */
export default function PillCalibration() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lang = useAppStore((s) => s.uiLang);
  const theme = useTheme();
  // calibration time per pill (goal: under 1 minute), measured from when this screen opens
  const startedAt = useRef(0);
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [photos, setPhotos] = useState<(AnalyzedPhoto | null)[]>([null, null, null]);
  const [busy, setBusy] = useState<number | null>(null);
  const [spec, setSpec] = useState<PillSpec | null>(null);
  const [description, setDescription] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    void (async () => {
      const repo = await getRepository();
      setMedicine((await repo.listMedicines()).find((m) => m.id === id) ?? null);
    })();
  }, [id]);

  const refresh = async (next: (AnalyzedPhoto | null)[]) => {
    const done = next.filter((p): p is AnalyzedPhoto => !!p);
    const c = combine(done);
    if (!c || !done[0]) return;
    const extra = await readImprintAndDescribe(done[0], c.spec);
    setSpec({ ...c.spec, imprint: extra.imprint || spec?.imprint });
    setDescription(extra.description);
    setMsg(c.agree ? '' : t(lang, 'pill.photosDisagree'));
  };

  const shoot = async (i: number, source: 'camera' | 'library' | 'sample') => {
    setBusy(i);
    try {
      let shot: AnalyzedPhoto | null = null;
      if (source === 'sample') shot = samplePhoto(SAMPLE_SPECS[id ?? ''] ?? FALLBACK_SAMPLE, i + 1);
      else {
        const p = await takePhoto(source);
        if (p) shot = await analyzePhoto(p);
      }
      if (!shot) return;
      const next = photos.map((p, j) => (j === i ? shot : p));
      setPhotos(next);
      await refresh(next);
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    const done = photos.filter((p): p is AnalyzedPhoto => !!p);
    if (!medicine || !spec || done.length === 0) {
      setMsg(t(lang, 'pill.needPhoto'));
      return;
    }
    await savePillProfile({ medicine, spec, description, photos: done, startedAt: startedAt.current });
    router.replace('/buddy/lookalikes');
  };

  if (!medicine) return <Screen>{null}</Screen>;
  const first = photos.find((p) => p)?.analysis;
  const set = (patch: Partial<PillSpec>) => spec && setSpec({ ...spec, ...patch });

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'pill.title', { name: medicine.name })}
      </AppText>
      <AppText lang={lang} size={16}>{t(lang, 'pill.help')}</AppText>
      <AppText lang={lang} size={15} color={theme.textMuted}>{t(lang, 'pill.envelopeHelp')}</AppText>

      {SHOTS.map((shot, i) => {
        const p = photos[i];
        const warnings = p?.analysis.warnings ?? [];
        return (
          <Section key={shot} title={t(lang, `pill.shot.${shot}`)} lang={lang}>
            {p && (
              <View style={styles.row}>
                <Image accessibilityIgnoresInvertColors source={{ uri: p.uri }} style={styles.thumb} resizeMode="cover" accessibilityElementsHidden />
                <View style={styles.flex}>
                  {p.analysis.features ? (
                    <AppText lang={lang} size={15} color={theme.taken}>
                      {t(lang, 'pill.measured', { ms: p.ms, c: p.analysis.features.confidence.toFixed(2) })}
                    </AppText>
                  ) : null}
                  {warnings.map((w) => (
                    <AppText key={w} lang={lang} size={15} color={theme.missed} accessibilityLiveRegion="polite">
                      {t(lang, `warn.${w}` as StringKey)}
                    </AppText>
                  ))}
                </View>
              </View>
            )}
            {busy === i ? (
              <View style={styles.row} accessibilityLiveRegion="polite">
                <ActivityIndicator />
                <AppText lang={lang} size={16}>{t(lang, 'pill.analyzing')}</AppText>
              </View>
            ) : (
              <View style={styles.buttons}>
                {Platform.OS !== 'web' && <FamilyButton lang={lang} primary label={p ? t(lang, 'pill.retake') : t(lang, 'pill.camera')} onPress={() => shoot(i, 'camera')} />}
                <FamilyButton lang={lang} label={t(lang, 'pill.library')} onPress={() => shoot(i, 'library')} />
                {DEMO_MODE && <FamilyButton lang={lang} label={t(lang, 'pill.sample')} onPress={() => shoot(i, 'sample')} />}
              </View>
            )}
          </Section>
        );
      })}

      {spec && (
        <Section title={t(lang, 'pill.review')} lang={lang}>
          <View style={styles.compare}>
            <View style={styles.compareCol}>
              <AppText lang={lang} size={15} bold>{t(lang, 'pill.realPhoto')}</AppText>
              {first && photos[0] && (
                <Image accessibilityIgnoresInvertColors source={{ uri: photos[0].cropUri ?? photos[0].uri }} style={styles.real} resizeMode="contain" />
              )}
            </View>
            <View style={styles.compareCol}>
              <AppText lang={lang} size={15} bold>{t(lang, 'pill.drawing')}</AppText>
              <Backdrop radius={12} pad={6}>
                <PillGraphic spec={spec} size={150} />
              </Backdrop>
            </View>
          </View>

          <AppText lang={lang} size={16} bold>{t(lang, 'pill.shape')}</AppText>
          <ChipRow label={t(lang, 'pill.shape')}>
            {SHAPES.map((s) => (
              <Chip key={s} lang={lang} label={shapeWord(lang, s)} selected={spec.shape === s} onPress={() => set({ shape: s })} />
            ))}
          </ChipRow>
          <AppText lang={lang} size={16} bold>{t(lang, 'pill.colorA')}</AppText>
          <ChipRow label={t(lang, 'pill.colorA')}>
            {COLORS.map((c) => (
              <ColorChip key={c} lang={lang} label={colorWord(lang, c)} color={PILL_COLORS[c]} selected={spec.colorA === c} onPress={() => set({ colorA: c })} />
            ))}
          </ChipRow>
          <AppText lang={lang} size={16} bold>{t(lang, 'pill.split')}</AppText>
          <ChipRow label={t(lang, 'pill.split')}>
            {(['none', 'vertical', 'horizontal'] as const).map((s) => (
              <Chip
                key={s}
                lang={lang}
                label={t(lang, `split.${s}`)}
                selected={(spec.split ?? 'none') === s}
                onPress={() => set({ split: s, colorB: s === 'none' ? undefined : spec.colorB ?? 'white' })}
              />
            ))}
          </ChipRow>
          {(spec.split ?? 'none') !== 'none' && (
            <>
              <AppText lang={lang} size={16} bold>{t(lang, 'pill.colorB')}</AppText>
              <ChipRow label={t(lang, 'pill.colorB')}>
                {COLORS.map((c) => (
                  <ColorChip key={c} lang={lang} label={colorWord(lang, c)} color={PILL_COLORS[c]} selected={spec.colorB === c} onPress={() => set({ colorB: c })} />
                ))}
              </ChipRow>
            </>
          )}
          <ChipRow label={t(lang, 'pill.score')}>
            <Chip lang={lang} label={`${t(lang, 'pill.score')}: ${t(lang, spec.score ? 'common.on' : 'common.off')}`} selected={!!spec.score} onPress={() => set({ score: !spec.score })} />
          </ChipRow>
          <Field lang={lang} label={t(lang, 'pill.imprint')} value={spec.imprint ?? ''} onChange={(v) => set({ imprint: v.slice(0, 8) })} />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Field
                lang={lang}
                label={t(lang, 'pill.length')}
                keyboard="numeric"
                value={spec.sizeMm ? String(spec.sizeMm.length) : ''}
                onChange={(v) => set({ sizeMm: { length: Number(v) || 0, width: spec.sizeMm?.width ?? 0 } })}
              />
            </View>
            <View style={styles.flex}>
              <Field
                lang={lang}
                label={t(lang, 'pill.width')}
                keyboard="numeric"
                value={spec.sizeMm ? String(spec.sizeMm.width) : ''}
                onChange={(v) => set({ sizeMm: { length: spec.sizeMm?.length ?? 0, width: Number(v) || 0 } })}
              />
            </View>
          </View>
          <Field lang={lang} label={t(lang, 'pill.description')} value={description} onChange={setDescription} />
        </Section>
      )}

      {!!msg && <AppText lang={lang} size={16} color={theme.missed} accessibilityLiveRegion="polite">{msg}</AppText>}
      {spec && <FamilyButton lang={lang} primary label={t(lang, 'pill.yesSave')} onPress={save} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  buttons: { gap: 10 },
  thumb: { width: 96, height: 72, borderRadius: 8 },
  compare: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  compareCol: { flex: 1, minWidth: 150, alignItems: 'center', gap: 6 },
  real: { width: 150, height: 150, borderRadius: 12 },
});
