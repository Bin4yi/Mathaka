import { LANGS, parseHm, type Elder, type Person } from '@mathaka/core';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../../components/AppText';
import { Chip, ChipRow, Field, FamilyButton, Section } from '../../components/family/FamilyUI';
import { Screen } from '../../components/Screen';
import { getRepository } from '../../db/bootstrap';
import { LANG_NAMES, t } from '../../i18n';
import { markChanged } from '../../services/calibrationService';
import { newId } from '../../services/ids';
import { useAppStore } from '../../store/appStore';

const NEW_ELDER: Elder = {
  id: 'elder-1',
  preferredName: '',
  language: 'si',
  times: { wake: '06:30', breakfast: '08:00', lunch: '13:00', dinner: '19:30', sleep: '22:00' },
  a11y: { fontScale: 1, highContrast: false, hearing: false, tremor: false, screenReader: false, confirmTaken: true },
};
const TIME_KEYS = ['wake', 'breakfast', 'lunch', 'dinner', 'sleep'] as const;
const A11Y_KEYS = ['tremor', 'hearing', 'highContrast', 'screenReader'] as const;

/** Step 1: who the elder is, their day, their family, and their needs. */
export default function ProfileScreen() {
  const lang = useAppStore((s) => s.uiLang);
  const theme = useTheme();
  const [elder, setElder] = useState<Elder | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    void (async () => {
      const repo = await getRepository();
      setElder((await repo.getElder()) ?? NEW_ELDER);
      setPeople(await repo.listPeople());
    })();
  }, []);
  if (!elder) return <Screen>{null}</Screen>;

  const timesOk = TIME_KEYS.every((k) => {
    try {
      parseHm(elder.times[k]);
      return true;
    } catch {
      return false;
    }
  });

  const save = async () => {
    if (!timesOk || !elder.preferredName.trim()) {
      setMsg(t(lang, 'common.badTime'));
      return;
    }
    const repo = await getRepository();
    await repo.saveElder({ ...elder, preferredName: elder.preferredName.trim() });
    for (const p of people.filter((x) => x.name.trim())) await repo.savePerson({ ...p, name: p.name.trim() });
    await markChanged('elder profile');
    setMsg(t(lang, 'common.saved'));
    router.back();
  };

  const setPerson = (i: number, patch: Partial<Person>) => setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'profile.title')}
      </AppText>

      <Section title={t(lang, 'profile.name')} lang={lang}>
        <Field lang={lang} label={t(lang, 'profile.name')} value={elder.preferredName} onChange={(v) => setElder({ ...elder, preferredName: v })} />
        <AppText lang={lang} size={16} bold>{t(lang, 'profile.language')}</AppText>
        <ChipRow label={t(lang, 'profile.language')}>
          {LANGS.map((l) => (
            <Chip key={l} lang={l} label={LANG_NAMES[l]} selected={elder.language === l} onPress={() => setElder({ ...elder, language: l })} />
          ))}
        </ChipRow>
      </Section>

      <Section title={t(lang, 'profile.times')} lang={lang}>
        <AppText lang={lang} size={15} color={theme.textMuted}>{t(lang, 'time.format')}</AppText>
        {TIME_KEYS.map((k) => (
          <Field
            key={k}
            lang={lang}
            label={t(lang, `time.${k}`)}
            value={elder.times[k]}
            keyboard="numbers-and-punctuation"
            onChange={(v) => setElder({ ...elder, times: { ...elder.times, [k]: v } })}
          />
        ))}
      </Section>

      <Section title={t(lang, 'profile.people')} lang={lang}>
        {people.map((p, i) => (
          <View key={p.id} style={{ gap: 8, borderBottomWidth: 1, borderColor: theme.textMuted, paddingBottom: 12 }}>
            <Field lang={lang} label={t(lang, 'person.name')} value={p.name} onChange={(v) => setPerson(i, { name: v })} />
            <Field lang={lang} label={t(lang, 'person.relation')} value={p.relation ?? ''} onChange={(v) => setPerson(i, { relation: v })} />
            <Field lang={lang} label={t(lang, 'person.phone')} value={p.phone ?? ''} keyboard="phone-pad" onChange={(v) => setPerson(i, { phone: v })} />
            <ChipRow label={t(lang, 'person.role')}>
              <Chip lang={lang} label={t(lang, 'role.familyMember')} selected={p.role === 'family'} onPress={() => setPerson(i, { role: 'family' })} />
              <Chip lang={lang} label={t(lang, 'role.buddy')} selected={p.role === 'buddy'} onPress={() => setPerson(i, { role: 'buddy' })} />
            </ChipRow>
          </View>
        ))}
        <FamilyButton
          lang={lang}
          label={t(lang, 'profile.addPerson')}
          onPress={() => setPeople((ps) => [...ps, { id: newId('p'), name: '', role: ps.length === 0 ? 'buddy' : 'family' }])}
        />
      </Section>

      <Section title={t(lang, 'profile.a11y')} lang={lang}>
        <ChipRow label={t(lang, 'profile.a11y')}>
          {A11Y_KEYS.map((k) => (
            <Chip
              key={k}
              lang={lang}
              label={t(lang, `a11y.${k}`)}
              selected={elder.a11y[k]}
              onPress={() => setElder({ ...elder, a11y: { ...elder.a11y, [k]: !elder.a11y[k] } })}
            />
          ))}
        </ChipRow>
      </Section>

      {!!msg && <AppText lang={lang} size={16} accessibilityLiveRegion="polite">{msg}</AppText>}
      <FamilyButton lang={lang} primary label={t(lang, 'common.save')} onPress={save} />
    </Screen>
  );
}
