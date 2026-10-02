import { bmpDataUri, synthPhoto } from '@mathaka/core';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { applyAiSettings, getAi, getAiSettings, type AiMode, type AiSettings } from '../../ai';
import { LaptopHelperAdapter } from '../../ai/helperAdapter';
import { formatGb, MODELS, totalBytes, type ModelSpec } from '../../ai/models';
import { AppText } from '../../components/AppText';
import { Chip, ChipRow, Field, FamilyButton, Section } from '../../components/family/FamilyUI';
import { Screen } from '../../components/Screen';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n';
import {
  deleteModel,
  deviceRamGb,
  downloadModel,
  freeSpaceBytes,
  installedModels,
  MODELS_SUPPORTED,
  type Progress,
} from '../../services/modelManager';
import { useAppStore } from '../../store/appStore';

const MODES: AiMode[] = ['mock', 'on-device', 'helper'];

/** Family phone: choose where AI runs, download models (Wi-Fi, checked), test it. */
export default function AiScreen() {
  const lang = useAppStore((s) => s.uiLang);
  const version = useAppStore((s) => s.dataVersion);
  const theme = useTheme();
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [progress, setProgress] = useState<Record<string, Progress | undefined>>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const { data } = useLoad(async () => {
    const s = await getAiSettings();
    setSettings((old) => old ?? s);
    return { installed: await installedModels(), ram: deviceRamGb(), free: freeSpaceBytes(), saved: s };
  }, [version]);
  if (!data || !settings) return <Screen>{null}</Screen>;

  const save = async (next: AiSettings) => {
    setSettings(next);
    await applyAiSettings(next);
  };

  const testHelper = async () => {
    setMsg('');
    try {
      const h = await new LaptopHelperAdapter(settings.helperUrl).health();
      setMsg(t(lang, 'ai.testOk', { model: String((h as { gemma_model?: string }).gemma_model ?? '?') }));
    } catch (e) {
      setMsg(t(lang, 'ai.testFail', { error: String(e) }));
    }
  };

  const download = async (m: ModelSpec) => {
    setMsg('');
    try {
      await downloadModel(m, (p) => setProgress((old) => ({ ...old, [m.id]: p })));
      setProgress((old) => ({ ...old, [m.id]: undefined }));
    } catch (e) {
      setMsg(t(lang, 'ai.error', { error: e instanceof Error ? e.message : String(e) }));
      setProgress((old) => ({ ...old, [m.id]: undefined }));
    }
  };

  const tryIt = async () => {
    setBusy(true);
    setMsg('');
    const spec = { shape: 'round' as const, colorA: 'pink', imprint: '5', sizeMm: { length: 7, width: 7 } };
    const t0 = Date.now();
    try {
      const uri = bmpDataUri(synthPhoto(spec, { width: 320, height: 240, seed: 4 }));
      const text = await getAi().describePill(uri, spec);
      setMsg(t(lang, 'ai.result', { s: ((Date.now() - t0) / 1000).toFixed(1), text }));
    } catch (e) {
      setMsg(t(lang, 'ai.error', { error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'ai.title')}
      </AppText>
      <AppText lang={lang} size={16} color={theme.textMuted}>{t(lang, 'ai.hint')}</AppText>
      <AppText lang={lang} size={15} color={theme.textMuted}>{t(lang, 'ai.elderNote')}</AppText>

      <Section title={t(lang, 'ai.mode')} lang={lang}>
        <ChipRow label={t(lang, 'ai.mode')}>
          {MODES.map((m) => (
            <Chip key={m} lang={lang} label={t(lang, `ai.mode.${m}`)} selected={settings.mode === m} onPress={() => void save({ ...settings, mode: m })} />
          ))}
        </ChipRow>
        <AppText lang={lang} size={15} color={theme.textMuted}>
          {t(lang, 'family.ai', { kind: getAi().kind })}
        </AppText>
      </Section>

      {settings.mode === 'helper' && (
        <Section title={t(lang, 'ai.helperUrl')} lang={lang}>
          <Field lang="en" label={t(lang, 'ai.helperUrl')} value={settings.helperUrl} onChange={(v) => setSettings({ ...settings, helperUrl: v.trim() })} />
          <FamilyButton lang={lang} label={t(lang, 'common.save')} onPress={() => save(settings)} />
          <FamilyButton lang={lang} label={t(lang, 'ai.test')} onPress={testHelper} />
        </Section>
      )}

      <Section title={t(lang, 'ai.models')} lang={lang}>
        {!MODELS_SUPPORTED && <AppText lang={lang} size={16}>{t(lang, 'ai.webNote')}</AppText>}
        <AppText lang={lang} size={16}>
          {data.ram ? t(lang, 'ai.ram', { ram: data.ram.toFixed(1) }) : t(lang, 'ai.ramUnknown')}
          {data.free ? ` ${t(lang, 'ai.free', { size: formatGb(data.free) })}` : ''}
        </AppText>
        {MODELS.filter((m) => m.role === 'family').map((m) => {
          const installed = data.installed.includes(m.id);
          const p = progress[m.id];
          const tooWeak = data.ram !== null && data.ram < m.minRamGb;
          return (
            <View key={m.id} style={{ gap: 8, borderTopWidth: 1, borderColor: theme.textMuted, paddingTop: 10 }}>
              <AppText lang="en" size={17} bold>{m.title}</AppText>
              <AppText lang={lang} size={15}>
                {t(lang, 'ai.size', { size: formatGb(totalBytes(m)) })} · {t(lang, 'ai.licence', { licence: m.licence })}
              </AppText>
              {tooWeak && <AppText lang={lang} size={15} color={theme.missed}>{t(lang, 'ai.ramLow')}</AppText>}
              {p && (
                <AppText lang={lang} size={15} accessibilityLiveRegion="polite">
                  {t(lang, p.phase === 'download' ? 'ai.downloading' : 'ai.verifying', { file: p.file, pct: Math.floor((100 * p.done) / Math.max(1, p.total)) })}
                </AppText>
              )}
              {installed ? (
                <>
                  <AppText lang={lang} size={15} color={theme.taken}>{t(lang, 'ai.installed')}</AppText>
                  <ChipRow label={m.title}>
                    <Chip
                      lang={lang}
                      label={settings.mode === 'on-device' && settings.modelId === m.id ? t(lang, 'ai.inUse') : t(lang, 'ai.use')}
                      selected={settings.mode === 'on-device' && settings.modelId === m.id}
                      onPress={() => void save({ ...settings, mode: 'on-device', modelId: m.id })}
                    />
                    <Chip lang={lang} label={t(lang, 'ai.delete')} selected={false} onPress={() => void deleteModel(m)} />
                  </ChipRow>
                </>
              ) : (
                MODELS_SUPPORTED && !p && <FamilyButton lang={lang} label={t(lang, 'ai.download')} onPress={() => download(m)} />
              )}
            </View>
          );
        })}
      </Section>

      <FamilyButton lang={lang} primary label={t(lang, 'ai.tryIt')} onPress={tryIt} />
      {busy && <ActivityIndicator />}
      {!!msg && <AppText lang={lang} size={16} accessibilityLiveRegion="polite">{msg}</AppText>}
    </Screen>
  );
}
