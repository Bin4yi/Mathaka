import { readFrequency, sortSlots, SLOTS, type Meal, type PrescriptionRow, type Slot } from '@mathaka/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { getAi } from '../../ai';
import { AppText } from '../../components/AppText';
import { Chip, ChipRow, Field, FamilyButton, Section } from '../../components/family/FamilyUI';
import { Screen } from '../../components/Screen';
import { t, type StringKey } from '../../i18n';
import { saveMedicineWithSchedule } from '../../services/calibrationService';
import { newId } from '../../services/ids';
import { takePhoto } from '../../services/photos';
import { useAppStore } from '../../store/appStore';

type Row = PrescriptionRow & { key: string; confirmed: boolean; freqNote: string };

/** Step 2: photo -> AI draft list -> the Buddy confirms every row. Nothing is saved unconfirmed. */
export default function PrescriptionScreen() {
  const lang = useAppStore((s) => s.uiLang);
  const theme = useTheme();
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState('');

  const scan = async (source: 'camera' | 'library') => {
    const p = await takePhoto(source);
    if (!p) return;
    setPhoto(p.uri);
    setBusy(true);
    setMsg('');
    try {
      const draft = await getAi().extractPrescription(p.uri);
      setRows(
        draft.rows.map((r) => {
          // the AI's slots win only when it gave some; else read the frequency note by rules
          const f = readFrequency(r.frequency_raw);
          const times = r.times.length ? r.times : f.slots;
          const meal = r.meal !== 'any' ? r.meal : f.meal;
          const slotWords = sortSlots(times).map((s) => t(lang, `slot.${s}` as StringKey)).join(', ');
          return { ...r, times, meal, key: newId('row'), confirmed: false, freqNote: r.frequency_raw ? t(lang, 'rx.frequencyRead', { raw: r.frequency_raw, slots: slotWords }) : '' };
        }),
      );
    } catch {
      setMsg(t(lang, 'rx.failed'));
    } finally {
      setBusy(false);
    }
  };

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, confirmed: patch.confirmed ?? false } : r)));
  const left = rows.filter((r) => !r.confirmed).length;

  const saveAll = async () => {
    if (left > 0) {
      setMsg(t(lang, 'rx.notAll', { n: left }));
      return;
    }
    for (const r of rows) {
      await saveMedicineWithSchedule(
        {
          id: newId('m'),
          name: r.name,
          strength: r.strength,
          form: r.form === 'capsule' ? 'capsule' : r.form === 'liquid' ? 'liquid' : 'tablet',
          purpose: { si: '', ta: '', en: '' },
          receivedCount: 0,
          remainingCount: 0,
        },
        r.times.map((slot) => ({ slot, count: r.dose_count, meal: r.meal })),
      );
    }
    router.replace('/buddy/home');
  };

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'rx.title')}
      </AppText>
      <AppText lang={lang} size={16} color={theme.textMuted}>{t(lang, 'rx.hint')}</AppText>
      <View style={styles.row}>
        <View style={styles.flex}>
          <FamilyButton lang={lang} primary label={t(lang, 'rx.takePhoto')} onPress={() => scan('camera')} />
        </View>
        <View style={styles.flex}>
          <FamilyButton lang={lang} label={t(lang, 'rx.choosePhoto')} onPress={() => scan('library')} />
        </View>
      </View>
      {photo && <Image accessibilityIgnoresInvertColors source={{ uri: photo }} style={styles.photo} resizeMode="contain" accessibilityElementsHidden />}
      {busy && (
        <View style={styles.row} accessibilityLiveRegion="polite">
          <ActivityIndicator />
          <AppText lang={lang} size={16}>{t(lang, 'rx.reading')}</AppText>
        </View>
      )}
      {rows.length > 0 && <AppText lang={lang} size={16} bold>{t(lang, 'rx.rowsHint')}</AppText>}

      {rows.map((r) => (
        <Section key={r.key} title={r.name || '—'} lang="en">
          {r.confidence < 0.75 && <AppText lang={lang} size={15} color={theme.missed}>{t(lang, 'rx.lowConfidence')}</AppText>}
          <Field lang={lang} label={t(lang, 'med.name')} value={r.name} onChange={(v) => update(r.key, { name: v })} />
          <Field lang={lang} label={t(lang, 'med.strength')} value={r.strength} onChange={(v) => update(r.key, { strength: v })} />
          {!!r.freqNote && <AppText lang={lang} size={15} color={theme.textMuted}>{r.freqNote}</AppText>}
          <AppText lang={lang} size={16} bold>{t(lang, 'med.slots')}</AppText>
          <ChipRow label={t(lang, 'med.slots')}>
            {SLOTS.map((s: Slot) => (
              <Chip
                key={s}
                lang={lang}
                label={t(lang, `slot.${s}` as StringKey)}
                selected={r.times.includes(s)}
                onPress={() => update(r.key, { times: r.times.includes(s) ? r.times.filter((x) => x !== s) : sortSlots([...r.times, s]) })}
              />
            ))}
          </ChipRow>
          <AppText lang={lang} size={16} bold>{t(lang, 'med.count')}</AppText>
          <ChipRow label={t(lang, 'med.count')}>
            {[0.5, 1, 2, 3].map((n) => (
              <Chip key={n} lang="en" label={n === 0.5 ? '½' : String(n)} selected={r.dose_count === n} onPress={() => update(r.key, { dose_count: n })} />
            ))}
          </ChipRow>
          <AppText lang={lang} size={16} bold>{t(lang, 'med.meal')}</AppText>
          <ChipRow label={t(lang, 'med.meal')}>
            {(['before', 'after', 'any'] as Meal[]).map((m) => (
              <Chip key={m} lang={lang} label={t(lang, `meal.${m}`)} selected={r.meal === m} onPress={() => update(r.key, { meal: m })} />
            ))}
          </ChipRow>
          <Chip
            lang={lang}
            label={r.confirmed ? `✓ ${t(lang, 'rx.confirmed')}` : t(lang, 'rx.confirmRow')}
            selected={r.confirmed}
            onPress={() => update(r.key, { confirmed: !r.confirmed && !!r.name.trim() && r.times.length > 0 })}
          />
        </Section>
      ))}

      {!!msg && <AppText lang={lang} size={16} color={theme.missed} accessibilityLiveRegion="polite">{msg}</AppText>}
      {rows.length > 0 && <FamilyButton lang={lang} primary label={t(lang, 'rx.saveAll')} onPress={saveAll} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  photo: { width: '100%', height: 220, borderRadius: 12 },
});
