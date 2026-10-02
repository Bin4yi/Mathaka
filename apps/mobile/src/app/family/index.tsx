import { addDays, dateKey, type Alert, type Medicine } from '@mathaka/core';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { getAi } from '../../ai';
import { AppText } from '../../components/AppText';
import { PillImage } from '../../components/PillImage';
import { Screen } from '../../components/Screen';
import { DEMO_MODE } from '../../config';
import { getRepository, resetDemoData } from '../../db/bootstrap';
import { useLoad } from '../../hooks/useLoad';
import { t, type StringKey } from '../../i18n';
import { clock } from '../../services/clock';
import { saveRole } from '../../services/settings';
import { useAppStore } from '../../store/appStore';

/**
 * M1 family dashboard: medicines, 7-day counts and alerts from the repository.
 * M2 adds the today timeline, demo-time control and PIN; later milestones add the rest.
 */
export default function FamilyHome() {
  const lang = useAppStore((s) => s.uiLang);
  const theme = useTheme();

  const { data, reload } = useLoad(async () => {
    const repo = await getRepository();
    const now = clock.now();
    const [elder, medicines, profiles, events, alerts] = await Promise.all([
      repo.getElder(),
      repo.listMedicines(),
      repo.listPillProfiles(),
      repo.listDoseEvents(dateKey(addDays(now, -7)), dateKey(now)),
      repo.listAlerts(),
    ]);
    const count = (s: string) => events.filter((e) => e.status === s).length;
    return {
      elder,
      medicines,
      profiles,
      alerts,
      counts: { taken: count('taken'), missed: count('missed'), prevented: count('prevented_double') },
      storage: repo.kind,
    };
  }, []);

  if (!data) return <Screen>{null}</Screen>;
  const medicineById = new Map(data.medicines.map((m) => [m.id, m]));

  const alertText = (a: Alert): string => {
    if (a.kind === 'missed' && a.slot) {
      return t(lang, 'family.alert.missed', {
        name: data.elder?.preferredName ?? '',
        slot: t(lang, `slot.${a.slot}`),
        date: a.date,
      });
    }
    if (a.kind === 'low_stock') {
      const m = medicineById.get(String(a.data?.medicineId ?? ''));
      return t(lang, 'family.alert.low_stock', { medicine: m ? label(m, lang) : '', remaining: a.data?.remaining ?? '' });
    }
    return t(lang, 'family.alert.other', { kind: a.kind });
  };

  return (
    <Screen>
      <View style={styles.row}>
        <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header" style={styles.flex}>
          {t(lang, 'family.title')}
        </AppText>
        {DEMO_MODE && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <AppText lang={lang} size={14} bold color={theme.onPrimary}>{t(lang, 'family.demo')}</AppText>
          </View>
        )}
      </View>
      <AppText lang={lang} size={14} color={theme.textMuted}>
        {t(lang, 'family.ai', { kind: getAi().kind })} · {t(lang, 'family.storage', { kind: data.storage })}
      </AppText>

      <Section title={t(lang, 'family.history')} lang={lang}>
        <View style={styles.counts}>
          <Count lang={lang} label="family.taken" value={data.counts.taken} color={theme.taken} />
          <Count lang={lang} label="family.missed" value={data.counts.missed} color={theme.missed} />
          <Count lang={lang} label="family.prevented" value={data.counts.prevented} color={theme.primary} />
        </View>
      </Section>

      <Section title={t(lang, 'family.medicines')} lang={lang}>
        {data.medicines.map((m) => {
          const profile = data.profiles.find((p) => p.medicineId === m.id);
          return (
            <View key={m.id} style={styles.row} accessible accessibilityLabel={`${label(m, lang)}. ${profile?.description ?? ''}`}>
              <PillImage assetKey={profile?.assetKey} size={56} />
              <View style={styles.flex}>
                <AppText lang={lang} size={SIZE.familyText} bold>{label(m, lang)}</AppText>
                <AppText lang="en" size={15} color={theme.textMuted}>
                  {[`${m.name} ${m.strength}`.trim(), profile?.description].filter(Boolean).join(' · ')}
                </AppText>
              </View>
              <AppText lang={lang} size={15} color={m.remainingCount < 7 ? theme.missed : theme.textMuted}>
                {t(lang, 'family.left', { n: m.remainingCount })}
              </AppText>
            </View>
          );
        })}
      </Section>

      <Section title={t(lang, 'family.alerts')} lang={lang}>
        {data.alerts.length === 0 && <AppText lang={lang} size={SIZE.familyText}>{t(lang, 'family.noAlerts')}</AppText>}
        {data.alerts.map((a) => (
          <AppText key={a.id} lang={lang} size={SIZE.familyText} color={a.readAt ? theme.textMuted : theme.text}>
            {a.readAt ? '' : '● '}
            {alertText(a)}
          </AppText>
        ))}
      </Section>

      <FamilyButton
        lang={lang}
        label={t(lang, 'family.switchRole')}
        onPress={async () => {
          await saveRole(null);
          router.replace('/role-picker');
        }}
      />
      {DEMO_MODE && (
        <FamilyButton
          lang={lang}
          label={t(lang, 'family.resetDemo')}
          onPress={async () => {
            await resetDemoData();
            await reload();
          }}
        />
      )}
    </Screen>
  );
}

function label(m: Medicine, lang: 'si' | 'ta' | 'en') {
  return m.purpose[lang] || m.purpose.en;
}

function Section({ title, lang, children }: { title: string; lang: 'si' | 'ta' | 'en'; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <AppText lang={lang} size={20} bold accessibilityRole="header">{title}</AppText>
      {children}
    </View>
  );
}

function Count({ lang, label, value, color }: { lang: 'si' | 'ta' | 'en'; label: StringKey; value: number; color: string }) {
  return (
    <View style={styles.count} accessible accessibilityLabel={`${t(lang, label)}: ${value}`}>
      <AppText lang="en" size={32} bold color={color}>{String(value)}</AppText>
      <AppText lang={lang} size={15}>{t(lang, label)}</AppText>
    </View>
  );
}

function FamilyButton({ lang, label, onPress }: { lang: 'si' | 'ta' | 'en'; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}
    >
      <AppText lang={lang} size={SIZE.familyText} bold>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  section: { borderWidth: 2, borderRadius: SIZE.radius, padding: SIZE.gap, gap: 12 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.gap },
  count: { minWidth: 96, alignItems: 'flex-start' },
  button: { minHeight: 56, borderWidth: 2, borderRadius: SIZE.radius, alignItems: 'center', justifyContent: 'center', padding: 12 },
});
