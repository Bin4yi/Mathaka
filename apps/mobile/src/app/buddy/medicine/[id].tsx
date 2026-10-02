import { sortSlots, SLOTS, type Meal, type Medicine, type Slot } from '@mathaka/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { SIZE } from '../../../a11y/tokens';
import { useTheme } from '../../../a11y/useTheme';
import { AppText } from '../../../components/AppText';
import { Chip, ChipRow, Field, FamilyButton, Section } from '../../../components/family/FamilyUI';
import { Screen } from '../../../components/Screen';
import { getRepository } from '../../../db/bootstrap';
import { t, type StringKey } from '../../../i18n';
import { saveMedicineWithSchedule } from '../../../services/calibrationService';
import { newId } from '../../../services/ids';
import { useAppStore } from '../../../store/appStore';

const EMPTY: Medicine = { id: '', name: '', strength: '', form: 'tablet', purpose: { si: '', ta: '', en: '' }, receivedCount: 0, remainingCount: 0 };
const FORMS: Medicine['form'][] = ['tablet', 'capsule', 'liquid', 'other'];

/** One medicine: name, plain purpose in 3 languages (what the elder sees), schedule, pill count. */
export default function MedicineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lang = useAppStore((s) => s.uiLang);
  const theme = useTheme();
  const [med, setMed] = useState<Medicine | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [count, setCount] = useState(1);
  const [meal, setMeal] = useState<Meal>('any');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    void (async () => {
      const repo = await getRepository();
      const found = (await repo.listMedicines()).find((m) => m.id === id);
      setMed(found ?? { ...EMPTY, id: newId('m') });
      const items = (await repo.listSchedule()).filter((s) => s.medicineId === id);
      setSlots(sortSlots(items.map((s) => s.slot)));
      if (items[0]) {
        setCount(items[0].count);
        setMeal(items[0].meal);
      }
    })();
  }, [id]);
  if (!med) return <Screen>{null}</Screen>;

  const save = async (thenPhotos: boolean) => {
    if (!med.name.trim() || slots.length === 0) {
      setMsg(t(lang, 'med.needName'));
      return;
    }
    const fallbackPurpose = med.purpose.en || med.purpose.si || med.purpose.ta || med.name;
    const purpose = {
      si: med.purpose.si || fallbackPurpose,
      ta: med.purpose.ta || fallbackPurpose,
      en: med.purpose.en || fallbackPurpose,
    };
    const remaining = med.remainingCount || med.receivedCount;
    await saveMedicineWithSchedule({ ...med, name: med.name.trim(), purpose, remainingCount: remaining }, slots.map((slot) => ({ slot, count, meal })));
    if (thenPhotos) router.replace({ pathname: '/buddy/pill/[id]', params: { id: med.id } });
    else router.back();
  };

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'med.title')}
      </AppText>
      <Section title={t(lang, 'med.name')} lang={lang}>
        <Field lang={lang} label={t(lang, 'med.name')} value={med.name} onChange={(v) => setMed({ ...med, name: v })} />
        <Field lang={lang} label={t(lang, 'med.strength')} value={med.strength} onChange={(v) => setMed({ ...med, strength: v })} />
        <AppText lang={lang} size={16} bold>{t(lang, 'med.form')}</AppText>
        <ChipRow label={t(lang, 'med.form')}>
          {FORMS.map((f) => (
            <Chip key={f} lang={lang} label={t(lang, `form.${f}`)} selected={med.form === f} onPress={() => setMed({ ...med, form: f })} />
          ))}
        </ChipRow>
      </Section>

      <Section title={t(lang, 'med.purposeEn')} lang={lang}>
        <AppText lang={lang} size={15} color={theme.textMuted}>{t(lang, 'med.purposeHint')}</AppText>
        <Field lang="si" label={t(lang, 'med.purposeSi')} value={med.purpose.si} onChange={(v) => setMed({ ...med, purpose: { ...med.purpose, si: v } })} />
        <Field lang="ta" label={t(lang, 'med.purposeTa')} value={med.purpose.ta} onChange={(v) => setMed({ ...med, purpose: { ...med.purpose, ta: v } })} />
        <Field lang="en" label={t(lang, 'med.purposeEn')} value={med.purpose.en} onChange={(v) => setMed({ ...med, purpose: { ...med.purpose, en: v } })} />
      </Section>

      <Section title={t(lang, 'med.slots')} lang={lang}>
        <ChipRow label={t(lang, 'med.slots')}>
          {SLOTS.map((s) => (
            <Chip
              key={s}
              lang={lang}
              label={t(lang, `slot.${s}` as StringKey)}
              selected={slots.includes(s)}
              onPress={() => setSlots(slots.includes(s) ? slots.filter((x) => x !== s) : sortSlots([...slots, s]))}
            />
          ))}
        </ChipRow>
        <AppText lang={lang} size={16} bold>{t(lang, 'med.count')}</AppText>
        <ChipRow label={t(lang, 'med.count')}>
          {[0.5, 1, 2, 3].map((n) => (
            <Chip key={n} lang="en" label={n === 0.5 ? '½' : String(n)} selected={count === n} onPress={() => setCount(n)} />
          ))}
        </ChipRow>
        <AppText lang={lang} size={16} bold>{t(lang, 'med.meal')}</AppText>
        <ChipRow label={t(lang, 'med.meal')}>
          {(['before', 'after', 'any'] as Meal[]).map((m) => (
            <Chip key={m} lang={lang} label={t(lang, `meal.${m}`)} selected={meal === m} onPress={() => setMeal(m)} />
          ))}
        </ChipRow>
      </Section>

      <Section title={t(lang, 'med.received')} lang={lang}>
        <Field
          lang={lang}
          label={t(lang, 'med.received')}
          keyboard="numeric"
          value={med.receivedCount ? String(med.receivedCount) : ''}
          onChange={(v) => {
            const n = Number(v.replace(/\D/g, '')) || 0;
            setMed({ ...med, receivedCount: n, remainingCount: n });
          }}
        />
      </Section>

      {!!msg && <AppText lang={lang} size={16} color={theme.missed} accessibilityLiveRegion="polite">{msg}</AppText>}
      <FamilyButton lang={lang} primary label={t(lang, 'med.calibratePill')} onPress={() => save(true)} />
      <FamilyButton lang={lang} label={t(lang, 'med.save')} onPress={() => save(false)} />
    </Screen>
  );
}
