import { clockText, isoClock, minutesOfDay, type Alert, type Lang, type Medicine, type SlotState } from '@mathaka/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Assets } from '../../../assets/generated';
import { SIZE, SLOT_COLORS } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { getAi } from '../../ai';
import { AppText } from '../../components/AppText';
import { partOfDay } from '../../components/elder/OrientationStrip';
import { SLOT_ICON } from '../../components/elder/VirtualPillBox';
import { ActionTile, Chip, ChipRow, FamilyButton, Section } from '../../components/family/FamilyUI';
import { Backdrop, Icon } from '../../components/Icon';
import { PillGraphic } from '../../components/PillGraphic';
import { Screen } from '../../components/Screen';
import { DEMO_MODE } from '../../config';
import { resetDemoData } from '../../db/bootstrap';
import { useLoad } from '../../hooks/useLoad';
import { t, type StringKey } from '../../i18n';
import { loadFamilyView, markAlertRead, weekFacts } from '../../services/familyService';
import { setDemoTime } from '../../services/settings';
import { useAppStore } from '../../store/appStore';
import { ProgressRing } from '../../ui/ProgressRing';
import { GlassPanel, NeuCard, neuShadow } from '../../ui/surfaces';

const STATUS_ICON = {
  taken: Assets.icons.statusTaken,
  due: Assets.icons.statusDue,
  late: Assets.icons.statusUnsure,
  missed: Assets.icons.statusMissed,
  upcoming: null,
} as const;

const ALERT_ICON = {
  missed: Assets.icons.statusMissed,
  unsure_answer: Assets.icons.statusUnsure,
  unsure_check: Assets.icons.checkPhoto,
  new_pill: Assets.icons.warningLookalike,
  low_stock: Assets.icons.refill,
  clinic_soon: Assets.icons.calendarClinic,
} as const;

const DEMO_TIMES: [number, number][] = [
  [8, 0],
  [13, 0],
  [20, 0],
  [22, 0],
];

/** Family dashboard: today at a glance, then alerts, week, summary, medicines. */
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
  const slotWord = (s: string) => t(lang, `slot.${s}` as StringKey);
  const taken = data.today.filter((s) => s.status === 'taken').length;
  const next = data.today.find((s) => s.status === 'due' || s.status === 'late' || s.status === 'upcoming');
  const unread = data.alerts.filter((a) => !a.readAt).length;

  const statusText = (s: SlotState) => {
    if (s.status === 'taken' && s.takenAt) return t(lang, 'family.status.taken', { time: isoClock(s.takenAt) });
    if (s.status === 'upcoming') return t(lang, 'family.status.upcoming', { time: clockText(s.window.dueAt) });
    return t(lang, `family.status.${s.status}` as StringKey);
  };

  const alertText = (a: Alert): string => {
    const slot = a.slot ? slotWord(a.slot) : '';
    if (a.kind === 'missed') return t(lang, 'family.alert.missed', { name: elderName, slot, date: a.date });
    if (a.kind === 'unsure_answer') return t(lang, 'family.alert.unsure_answer', { name: elderName, slot });
    if (a.kind === 'unsure_check') return t(lang, 'family.alert.unsure_check', { name: elderName, slot });
    if (a.kind === 'new_pill') return t(lang, 'family.alert.new_pill', { name: elderName });
    if (a.kind === 'clinic_soon') return t(lang, 'family.alert.clinic_soon', { date: String(a.data?.date ?? a.date) });
    if (a.kind === 'low_stock') {
      const m = medicineById.get(String(a.data?.medicineId ?? ''));
      return t(lang, 'family.alert.low_stock', { medicine: m ? purpose(m, lang) : '', remaining: a.data?.remaining ?? '' });
    }
    return t(lang, 'family.alert.other', { kind: a.kind });
  };

  const dailyUse = (m: Medicine) =>
    Object.values(elderView.bySlot)
      .flat()
      .filter((p) => p.medicine.id === m.id)
      .reduce((n, p) => n + p.item.count, 0);

  return (
    <Screen>
      {/* ---- hero ---- */}
      <GlassPanel blur style={styles.hero}>
        <View style={styles.flex}>
          <AppText lang={lang} size={16} color={theme.textMuted}>
            {t(lang, `greet.${partOfDay(elderView.now)}` as StringKey)}
          </AppText>
          <AppText lang={lang} size={30} bold accessibilityRole="header">
            {elderName}
          </AppText>
          <AppText lang={lang} size={17} bold style={styles.mt}>
            {t(lang, 'dash.dosesToday', { n: taken, total: data.today.length })}
          </AppText>
          <AppText lang={lang} size={15} color={theme.textMuted}>
            {next ? t(lang, 'dash.next', { slot: slotWord(next.slot), time: clockText(next.window.dueAt) }) : t(lang, 'dash.allDone')}
          </AppText>
          <View style={styles.badges}>
            {DEMO_MODE && <Badge text={t(lang, 'family.demo')} lang={lang} />}
            <Badge text={t(lang, 'family.ai', { kind: getAi().kind })} lang={lang} muted />
          </View>
        </View>
        <View style={styles.ringWrap} accessible accessibilityLabel={t(lang, 'dash.dosesToday', { n: taken, total: data.today.length })}>
          <ProgressRing value={taken} total={data.today.length} size={124} />
          <View style={styles.ringCenter}>
            <AppText lang="en" size={30} bold>
              {`${taken}/${data.today.length}`}
            </AppText>
          </View>
        </View>
      </GlassPanel>

      {/* ---- quick actions ---- */}
      <View style={styles.tiles} accessibilityLabel={t(lang, 'dash.quick')}>
        <ActionTile lang={lang} label={t(lang, 'family.openElder')} icon={Assets.icons.elder} onPress={() => router.push('/elder')} />
        <ActionTile lang={lang} label={t(lang, 'family.calibration')} icon={Assets.icons.pharmacist} onPress={() => router.push('/buddy/home')} />
        <ActionTile lang={lang} label={t(lang, 'family.sync')} icon={Assets.icons.family} onPress={() => router.push('/family/sync')} />
        <ActionTile lang={lang} label={t(lang, 'family.aiButton')} icon={Assets.icons.checkPhoto} onPress={() => router.push('/family/ai')} />
        <ActionTile lang={lang} label={t(lang, 'family.voice')} icon={Assets.icons.speaker} onPress={() => router.push('/family/voice')} />
        <ActionTile lang={lang} label={t(lang, 'family.more')} icon={Assets.icons.calendarClinic} onPress={() => router.push('/family/more')} />
        <ActionTile lang={lang} label={t(lang, 'family.settings')} icon={Assets.icons.lock} onPress={() => router.push('/family/settings')} />
        <ActionTile lang={lang} label={t(lang, 'buddy.step.box')} icon={Assets.illustrations.pillboxClosed} onPress={() => router.push('/buddy/box')} />
      </View>

      {DEMO_MODE && (
        <Section title={`${t(lang, 'family.demoTime')} · ${clockText(minutesOfDay(elderView.now))}`} lang={lang} icon={Assets.icons.timeNoon}>
          <ChipRow label={t(lang, 'family.demoTime')}>
            {DEMO_TIMES.map(([h, m]) => (
              <Chip key={h} lang="en" label={`${h}:${String(m).padStart(2, '0')}`} selected={false} onPress={() => void setDemoTime(h, m)} />
            ))}
            <Chip lang={lang} label={t(lang, 'family.realTime')} selected={offset === 0} onPress={() => void setDemoTime(null)} />
          </ChipRow>
        </Section>
      )}

      {/* ---- today timeline ---- */}
      <Section title={t(lang, 'family.today')} lang={lang} icon={Assets.icons.statusTaken}>
        {data.today.map((s) => (
          <NeuCard key={s.slot} depth={5} radius={18} style={styles.slotRow}>
            <View style={styles.row} accessible accessibilityLabel={`${slotWord(s.slot)}: ${statusText(s)}`}>
              <View style={[styles.slotBar, { backgroundColor: SLOT_COLORS[s.slot] }]} />
              <Icon source={SLOT_ICON[s.slot]} size={34} />
              <AppText lang={lang} size={SIZE.familyText} bold style={styles.slotName}>
                {slotWord(s.slot)}
              </AppText>
              <AppText
                lang={lang}
                size={16}
                style={styles.flex}
                color={s.status === 'taken' ? theme.taken : s.status === 'missed' || s.status === 'late' ? theme.missed : theme.textMuted}
              >
                {statusText(s)}
              </AppText>
              {STATUS_ICON[s.status] && <Image accessibilityIgnoresInvertColors source={STATUS_ICON[s.status]!} style={styles.icon28} />}
            </View>
          </NeuCard>
        ))}
        {data.preventedToday.map((e) => (
          <AppText key={e.id} lang={lang} size={16} bold color={theme.primary}>
            🛡 {t(lang, 'family.preventedAt', { time: e.at ? isoClock(e.at) : '' })}
          </AppText>
        ))}
        {data.questionsToday > 0 && (
          <AppText lang={lang} size={15} color={theme.textMuted}>
            {t(lang, 'family.questions', { n: data.questionsToday })}
          </AppText>
        )}
      </Section>

      {/* ---- alerts ---- */}
      <Section title={`${t(lang, 'family.alerts')}${unread ? ` · ${t(lang, 'dash.unread', { n: unread })}` : ''}`} lang={lang} icon={Assets.icons.statusDue}>
        {data.alerts.length === 0 && <AppText lang={lang} size={SIZE.familyText}>{t(lang, 'family.noAlerts')}</AppText>}
        {data.alerts.map((a) => (
          <NeuCard key={a.id} depth={a.readAt ? 3 : 6} radius={18} style={[styles.alert, { opacity: a.readAt ? 0.7 : 1 }]}>
            <Icon source={ALERT_ICON[a.kind]} size={36} />
            <View style={styles.flex}>
              <AppText lang={lang} size={16} color={a.readAt ? theme.textMuted : theme.text}>
                {alertText(a)}
              </AppText>
              {!a.readAt && (
                <Pressable accessibilityRole="button" accessibilityLabel={t(lang, 'family.markRead')} onPress={() => void markAlertRead(a)} style={styles.link}>
                  <AppText lang={lang} size={15} bold color={theme.primary}>
                    {t(lang, 'family.markRead')}
                  </AppText>
                </Pressable>
              )}
            </View>
          </NeuCard>
        ))}
      </Section>

      {/* ---- week ---- */}
      <Section title={t(lang, 'family.week')} lang={lang} icon={Assets.icons.calendarClinic}>
        <View style={styles.counts}>
          <Count lang={lang} label="family.taken" value={data.counts.taken} color={theme.taken} />
          <Count lang={lang} label="family.missed" value={data.counts.missed} color={theme.missed} />
          <Count lang={lang} label="family.prevented" value={data.counts.prevented} color={theme.primary} />
        </View>
        <View style={styles.row}>
          <View style={styles.date} />
          {elderView.active.map((s) => (
            <View key={s} style={styles.weekCell}>
              <Icon source={SLOT_ICON[s]} size={24} />
            </View>
          ))}
        </View>
        {data.week.map((w) => (
          <View key={w.date} style={styles.row}>
            <AppText lang="en" size={14} color={theme.textMuted} style={styles.date}>
              {w.date.slice(5)}
            </AppText>
            {w.states.map((s) => (
              <View
                key={s.slot}
                style={[
                  styles.weekCell,
                  styles.weekDot,
                  {
                    backgroundColor: theme.surface,
                    boxShadow: neuShadow(theme, 3, true),
                  },
                ]}
                accessible
                accessibilityLabel={`${w.date} ${slotWord(s.slot)}: ${statusText(s)}`}
              >
                {STATUS_ICON[s.status] ? <Image accessibilityIgnoresInvertColors source={STATUS_ICON[s.status]!} style={styles.icon22} /> : null}
              </View>
            ))}
          </View>
        ))}
      </Section>

      {/* ---- weekly summary (AI, from the log only) ---- */}
      <Section title={t(lang, 'summary.title')} lang={lang} icon={Assets.icons.speaker}>
        {summary && (
          <>
            <AppText lang={lang} size={17}>{summary.text}</AppText>
            <AppText lang={lang} size={13} color={theme.textMuted}>
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

      {/* ---- medicines ---- */}
      <Section title={t(lang, 'family.medicines')} lang={lang} icon={Assets.icons.refill}>
        {data.medicines.map((m) => {
          const profile = data.profiles.find((p) => p.medicineId === m.id);
          const perDay = dailyUse(m);
          const days = perDay > 0 ? Math.floor(m.remainingCount / perDay) : null;
          const low = days !== null && days < 7;
          const frac = m.receivedCount ? Math.min(1, m.remainingCount / m.receivedCount) : 0;
          return (
            <NeuCard key={m.id} depth={5} radius={20} style={styles.medRow}>
              <View style={styles.row} accessible accessibilityLabel={`${purpose(m, lang)}. ${profile?.description ?? ''}. ${t(lang, 'family.left', { n: m.remainingCount })}`}>
                {profile && (
                  <Backdrop radius={14} pad={2}>
                    <PillGraphic spec={profile.spec} size={58} />
                  </Backdrop>
                )}
                <View style={styles.flex}>
                  <AppText lang={lang} size={17} bold>
                    {purpose(m, lang)}
                  </AppText>
                  <AppText lang="en" size={14} color={theme.textMuted}>
                    {[`${m.name} ${m.strength}`.trim(), profile?.description].filter(Boolean).join(' · ')}
                  </AppText>
                  <View style={[styles.stockTrack, { backgroundColor: theme.surface, boxShadow: neuShadow(theme, 2, true) }]}>
                    <View style={[styles.stockFill, { width: `${Math.round(frac * 100)}%`, backgroundColor: low ? theme.missed : theme.taken }]} />
                  </View>
                  <AppText lang={lang} size={13} color={low ? theme.missed : theme.textMuted}>
                    {t(lang, 'family.left', { n: m.remainingCount })}
                    {days !== null ? ` · ${t(lang, 'dash.stockDays', { n: days })}` : ''}
                  </AppText>
                </View>
              </View>
            </NeuCard>
          );
        })}
      </Section>

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

function Badge({ text, lang, muted }: { text: string; lang: Lang; muted?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: muted ? theme.surface : theme.primary, boxShadow: neuShadow(theme, 3) }]}>
      <AppText lang={lang} size={12} bold color={muted ? theme.textMuted : theme.onPrimary}>
        {text}
      </AppText>
    </View>
  );
}

function Count({ lang, label, value, color }: { lang: Lang; label: StringKey; value: number; color: string }) {
  return (
    <NeuCard depth={5} radius={18} style={styles.count}>
      <View accessible accessibilityLabel={`${t(lang, label)}: ${value}`}>
        <AppText lang="en" size={30} bold color={color}>
          {String(value)}
        </AppText>
        <AppText lang={lang} size={13}>
          {t(lang, label)}
        </AppText>
      </View>
    </NeuCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mt: { marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 22 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  ringWrap: { width: 124, height: 124, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  slotRow: { paddingVertical: 10, paddingRight: 12, overflow: 'hidden' },
  slotBar: { width: 8, height: 40, borderRadius: 4, marginLeft: 8 },
  slotName: { minWidth: 76 },
  icon28: { width: 30, height: 30 },
  icon22: { width: 22, height: 22 },
  alert: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
  link: { minHeight: 40, justifyContent: 'center' },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  count: { flexGrow: 1, flexBasis: 90, padding: 14 },
  date: { width: 50 },
  weekCell: { width: 40, alignItems: 'center' },
  weekDot: { height: 34, borderRadius: 12, justifyContent: 'center' },
  medRow: { padding: 14 },
  stockTrack: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 6 },
  stockFill: { height: 10, borderRadius: 5 },
});
