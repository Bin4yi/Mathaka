import { clockText, isoClock, minutesOfDay, type Alert, type Lang, type Medicine, type SlotState } from '@mathaka/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Assets } from '../../../assets/generated';
import { SIZE, SLOT_COLORS } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { getAi } from '../../ai';
import { AppText } from '../../components/AppText';
import { SLOT_ICON } from '../../components/elder/VirtualPillBox';
import { FamilyButton, Section } from '../../components/family/FamilyUI';
import { PillGraphic } from '../../components/PillGraphic';
import { Screen } from '../../components/Screen';
import { DEMO_MODE } from '../../config';
import { resetDemoData } from '../../db/bootstrap';
import { useLoad } from '../../hooks/useLoad';
import { t, type StringKey } from '../../i18n';
import { loadFamilyView, markAlertRead, weekFacts } from '../../services/familyService';
import { setDemoTime } from '../../services/settings';
import { useAppStore } from '../../store/appStore';

const STATUS_ICON = {
  taken: Assets.icons.statusTaken,
  due: Assets.icons.statusDue,
  late: Assets.icons.statusUnsure,
  missed: Assets.icons.statusMissed,
  upcoming: null,
} as const;

const DEMO_TIMES: [number, number][] = [
  [8, 0],
  [13, 0],
  [20, 0],
  [22, 0],
];

export default function FamilyHome() {
  const lang = useAppStore((s) => s.uiLang);
  const version = useAppStore((s) => s.dataVersion);
  const offset = useAppStore((s) => s.demoOffsetMs);
  const theme = useTheme();
  const { data } = useLoad(() => loadFamilyView(), [version, offset]);
  const [summary, setSummary] = useState<{ text: string; engine: string } | null>(null);
  const [writing, setWriting] = useState(false);

  if (!data) return <Screen>{null}</Screen>;
  const { elderView } = data;
  const elderName = elderView.elder.preferredName;
  const medicineById = new Map(data.medicines.map((m) => [m.id, m]));

  const statusText = (s: SlotState) => {
    if (s.status === 'taken' && s.takenAt) return t(lang, 'family.status.taken', { time: isoClock(s.takenAt) });
    if (s.status === 'upcoming') return t(lang, 'family.status.upcoming', { time: clockText(s.window.dueAt) });
    return t(lang, `family.status.${s.status}` as StringKey);
  };

  const alertText = (a: Alert): string => {
    const slot = a.slot ? t(lang, `slot.${a.slot}` as StringKey) : '';
    if (a.kind === 'missed') return t(lang, 'family.alert.missed', { name: elderName, slot, date: a.date });
    if (a.kind === 'unsure_answer') return t(lang, 'family.alert.unsure_answer', { name: elderName, slot });
    if (a.kind === 'low_stock') {
      const m = medicineById.get(String(a.data?.medicineId ?? ''));
      return t(lang, 'family.alert.low_stock', { medicine: m ? purpose(m, lang) : '', remaining: a.data?.remaining ?? '' });
    }
    return t(lang, 'family.alert.other', { kind: a.kind });
  };

  return (
    <Screen>
      <View style={styles.row}>
        <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header" style={styles.flex}>
          {t(lang, 'family.title')} · {elderName}
        </AppText>
        {DEMO_MODE && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <AppText lang={lang} size={14} bold color={theme.onPrimary}>
              {t(lang, 'family.demo')}
            </AppText>
          </View>
        )}
      </View>
      <AppText lang={lang} size={14} color={theme.textMuted}>
        {t(lang, 'family.ai', { kind: getAi().kind })} · {t(lang, 'family.storage', { kind: data.storage })}
      </AppText>

      {DEMO_MODE && (
        <Section title={t(lang, 'family.demoTime')} lang={lang}>
          <AppText lang={lang} size={SIZE.familyText}>
            {t(lang, 'family.demoTimeNow', { time: clockText(minutesOfDay(elderView.now)) })}
          </AppText>
          <View style={styles.wrap}>
            {DEMO_TIMES.map(([h, m]) => (
              <FamilyButton key={h} lang="en" label={`${h}:${String(m).padStart(2, '0')}`} onPress={() => setDemoTime(h, m)} />
            ))}
            <FamilyButton lang={lang} label={t(lang, 'family.realTime')} onPress={() => setDemoTime(null)} />
          </View>
        </Section>
      )}

      <Section title={t(lang, 'family.today')} lang={lang}>
        {data.today.map((s) => (
          <View key={s.slot} style={styles.row} accessible accessibilityLabel={`${t(lang, `slot.${s.slot}` as StringKey)}: ${statusText(s)}`}>
            <View style={[styles.slotDot, { backgroundColor: SLOT_COLORS[s.slot] }]} />
            <Image accessibilityIgnoresInvertColors source={SLOT_ICON[s.slot]} style={styles.icon24} />
            <AppText lang={lang} size={SIZE.familyText} bold style={styles.slotName}>
              {t(lang, `slot.${s.slot}` as StringKey)}
            </AppText>
            <AppText
              lang={lang}
              size={SIZE.familyText}
              style={styles.flex}
              color={s.status === 'taken' ? theme.taken : s.status === 'missed' || s.status === 'late' ? theme.missed : theme.text}
            >
              {statusText(s)}
            </AppText>
            {STATUS_ICON[s.status] && <Image accessibilityIgnoresInvertColors source={STATUS_ICON[s.status]!} style={styles.icon24} />}
          </View>
        ))}
        {data.preventedToday.map((e) => (
          <AppText key={e.id} lang={lang} size={SIZE.familyText} color={theme.primary}>
            {t(lang, 'family.preventedAt', { time: e.at ? isoClock(e.at) : '' })}
          </AppText>
        ))}
        {data.questionsToday > 0 && (
          <AppText lang={lang} size={16} color={theme.textMuted}>
            {t(lang, 'family.questions', { n: data.questionsToday })}
          </AppText>
        )}
      </Section>

      <Section title={t(lang, 'family.alerts')} lang={lang}>
        {data.alerts.length === 0 && <AppText lang={lang} size={SIZE.familyText}>{t(lang, 'family.noAlerts')}</AppText>}
        {data.alerts.map((a) => (
          <View key={a.id} style={[styles.alert, { borderColor: a.readAt ? theme.textMuted : theme.missed }]}>
            <AppText lang={lang} size={SIZE.familyText} color={a.readAt ? theme.textMuted : theme.text}>
              {alertText(a)}
            </AppText>
            {!a.readAt && (
              <Pressable accessibilityRole="button" onPress={() => void markAlertRead(a)} style={styles.link}>
                <AppText lang={lang} size={16} bold color={theme.primary}>
                  {t(lang, 'family.markRead')}
                </AppText>
              </Pressable>
            )}
          </View>
        ))}
      </Section>

      <Section title={t(lang, 'family.week')} lang={lang}>
        <View style={styles.counts}>
          <Count lang={lang} label="family.taken" value={data.counts.taken} color={theme.taken} />
          <Count lang={lang} label="family.missed" value={data.counts.missed} color={theme.missed} />
          <Count lang={lang} label="family.prevented" value={data.counts.prevented} color={theme.primary} />
        </View>
        {data.week.map((w) => (
          <View key={w.date} style={styles.row}>
            <AppText lang="en" size={15} style={styles.date}>
              {w.date.slice(5)}
            </AppText>
            {w.states.map((s) => (
              <View key={s.slot} style={styles.weekCell} accessible accessibilityLabel={`${w.date} ${t(lang, `slot.${s.slot}` as StringKey)}: ${statusText(s)}`}>
                {STATUS_ICON[s.status] ? <Image accessibilityIgnoresInvertColors source={STATUS_ICON[s.status]!} style={styles.icon24} /> : <View style={styles.icon24} />}
              </View>
            ))}
          </View>
        ))}
      </Section>

      <Section title={t(lang, 'summary.title')} lang={lang}>
        {summary && (
          <>
            <AppText lang={lang} size={SIZE.familyText}>{summary.text}</AppText>
            <AppText lang={lang} size={14} color={theme.textMuted}>
              {t(lang, 'summary.label', { engine: t(lang, `summary.engine.${summary.engine}` as StringKey) })}
            </AppText>
          </>
        )}
        {writing ? (
          <View style={styles.row} accessibilityLiveRegion="polite">
            <ActivityIndicator />
            <AppText lang={lang} size={16}>{t(lang, 'summary.working')}</AppText>
          </View>
        ) : (
          <FamilyButton
            lang={lang}
            label={t(lang, 'summary.make')}
            onPress={async () => {
              setWriting(true);
              try {
                const ai = getAi();
                const text = await ai.weeklySummary({ lang, elderName, facts: weekFacts(data) });
                setSummary({ text, engine: ai.kind });
              } catch (e) {
                setSummary({ text: String(e), engine: getAi().kind });
              } finally {
                setWriting(false);
              }
            }}
          />
        )}
      </Section>

      <Section title={t(lang, 'family.medicines')} lang={lang}>
        {data.medicines.map((m) => {
          const profile = data.profiles.find((p) => p.medicineId === m.id);
          return (
            <View key={m.id} style={styles.row} accessible accessibilityLabel={`${purpose(m, lang)}. ${profile?.description ?? ''}`}>
              {profile && <PillGraphic spec={profile.spec} size={56} />}
              <View style={styles.flex}>
                <AppText lang={lang} size={SIZE.familyText} bold>
                  {purpose(m, lang)}
                </AppText>
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

      <FamilyButton lang={lang} primary label={t(lang, 'family.openElder')} onPress={() => router.push('/elder')} />
      <FamilyButton lang={lang} label={t(lang, 'family.calibration')} onPress={() => router.push('/buddy/home')} />
      <FamilyButton lang={lang} label={t(lang, 'family.sync')} onPress={() => router.push('/family/sync')} />
      <FamilyButton lang={lang} label={t(lang, 'family.aiButton')} onPress={() => router.push('/family/ai')} />
      <FamilyButton lang={lang} label={t(lang, 'family.settings')} onPress={() => router.push('/family/settings')} />
      {DEMO_MODE && (
        <FamilyButton
          lang={lang}
          label={t(lang, 'family.resetDemo')}
          onPress={async () => {
            await resetDemoData();
            useAppStore.getState().bumpData();
          }}
        />
      )}
    </Screen>
  );
}

function purpose(m: Medicine, lang: Lang) {
  return m.purpose[lang] || m.purpose.en;
}

function Count({ lang, label, value, color }: { lang: Lang; label: StringKey; value: number; color: string }) {
  return (
    <View style={styles.count} accessible accessibilityLabel={`${t(lang, label)}: ${value}`}>
      <AppText lang="en" size={32} bold color={color}>
        {String(value)}
      </AppText>
      <AppText lang={lang} size={15}>
        {t(lang, label)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZE.gap },
  count: { minWidth: 96 },
  slotDot: { width: 10, alignSelf: 'stretch', borderRadius: 5 },
  slotName: { minWidth: 80 },
  icon24: { width: 28, height: 28 },
  alert: { borderLeftWidth: 5, paddingLeft: 10, gap: 4 },
  link: { minHeight: 44, justifyContent: 'center' },
  date: { width: 52 },
  weekCell: { width: 40, alignItems: 'center' },
});
