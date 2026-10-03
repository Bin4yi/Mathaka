import { elderText, SLOT_WORD, type Meal } from '@mathaka/core';
import * as Brightness from 'expo-brightness';
import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Assets } from '../../../assets/generated';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../../components/AppText';
import { ElderButton } from '../../components/elder/ElderButton';
import { ElderScreen } from '../../components/elder/ElderScreen';
import { MessageCard } from '../../components/elder/MessageCard';
import { SlotPillCard } from '../../components/elder/SlotPillCard';
import { useElderView } from '../../hooks/useElderView';
import { t } from '../../i18n';
import { confirmTaken } from '../../services/doseService';
import { useAppStore } from '../../store/appStore';

const MEAL_ICON = { before: Assets.icons.mealBefore, after: Assets.icons.mealAfter, any: Assets.icons.waterGlass } as const;

/** During a dose: screen stays on and gets brighter; restored afterwards. */
function useDoseScreenLight() {
  useKeepAwake();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let previous: number | null = null;
    void (async () => {
      try {
        previous = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
      } catch {
        // brightness is a nice-to-have
      }
    })();
    return () => {
      if (previous !== null) void Brightness.setBrightnessAsync(previous).catch(() => {});
    };
  }, []);
}

/** Only this slot's pills. Nothing else. */
export default function DoseScreen() {
  useDoseScreenLight();
  const theme = useTheme();
  const { view } = useElderView();
  if (!view) return null;
  const lang = view.ctx.lang;
  const slot = view.open?.slot;

  const tookIt = async () => {
    if (view.elder.a11y.confirmTaken) {
      router.push('/elder/confirm');
      return;
    }
    useAppStore.getState().setElderMessage(await confirmTaken('button'));
    router.replace('/elder/answer');
  };

  if (!slot) {
    // Nothing open now (e.g. the time passed while this screen was open): go home calmly.
    return <Redirect href="/elder" />;
  }
  const pills = view.bySlot[slot];
  const meals = [...new Set(pills.map((p) => p.item.meal))] as Meal[];

  return (
    <ElderScreen
      lang={lang}
      now={view.now}
      actions={
        <>
          <ElderButton
            lang={lang}
            label={t(lang, 'elder.btn.tookIt')}
            hint={t(lang, 'elder.btn.tookItHint')}
            icon={Assets.icons.statusTaken}
            onPress={tookIt}
            testID="took-it"
          />
          <ElderButton lang={lang} variant="secondary" label={t(lang, 'elder.btn.home')} onPress={() => router.replace('/elder')} />
        </>
      }
    >
      <MessageCard lang={lang} text={elderText(view.ctx, 'dose.title', { slot: SLOT_WORD[lang][slot] })} autoSpeak />

      {pills.map((p) => (
        <SlotPillCard key={p.item.id} lang={lang} pill={p} />
      ))}

      <ElderButton
        lang={lang}
        variant="secondary"
        label={t(lang, 'elder.btn.check')}
        hint={t(lang, 'elder.btn.checkHint')}
        icon={Assets.icons.checkPhoto}
        onPress={() => router.push('/elder/check')}
        testID="check-pill"
      />

      <View style={[styles.meal, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        {meals.map((m) => (
          <View key={m} style={styles.mealRow}>
            <Image accessibilityIgnoresInvertColors source={MEAL_ICON[m]} style={styles.mealIcon} accessibilityElementsHidden importantForAccessibility="no" />
            <AppText lang={lang} size={SIZE.elderText} bold style={styles.flex}>
              {t(lang, `elder.meal.${m}`)}
            </AppText>
          </View>
        ))}
        <View style={styles.mealRow}>
          <Image accessibilityIgnoresInvertColors source={Assets.icons.waterGlass} style={styles.mealIcon} accessibilityElementsHidden importantForAccessibility="no" />
          <AppText lang={lang} size={SIZE.elderText} style={styles.flex}>
            {t(lang, 'elder.water')}
          </AppText>
        </View>
      </View>
    </ElderScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  meal: { borderWidth: 3, borderRadius: SIZE.radius, padding: SIZE.gap, gap: 8 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: SIZE.gap },
  mealIcon: { width: 64, height: 64 },
});
