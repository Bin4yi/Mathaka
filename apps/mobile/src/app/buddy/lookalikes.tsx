import { pillWords, type Medicine, type PillProfile } from '@mathaka/core';
import { router } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { Assets } from '../../../assets/generated';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { AppText } from '../../components/AppText';
import { FamilyButton, Section } from '../../components/family/FamilyUI';
import { Backdrop } from '../../components/Icon';
import { PillGraphic } from '../../components/PillGraphic';
import { Screen } from '../../components/Screen';
import { getRepository } from '../../db/bootstrap';
import { useLoad } from '../../hooks/useLoad';
import { t } from '../../i18n';
import { checkLookalikes } from '../../services/calibrationService';
import { useAppStore } from '../../store/appStore';

/** Step 4: pills that look too much alike, side by side, with a warning and advice. */
export default function LookalikesScreen() {
  const lang = useAppStore((s) => s.uiLang);
  const theme = useTheme();
  const { data } = useLoad(async () => {
    const { pairs, profiles } = await checkLookalikes();
    const medicines = await (await getRepository()).listMedicines();
    return { pairs, profiles, medicines };
  });
  if (!data) return <Screen>{null}</Screen>;
  const byId = new Map(data.profiles.map((p) => [p.id, p]));
  const med = (p: PillProfile): Medicine | undefined => data.medicines.find((m) => m.id === p.medicineId);

  const Side = ({ p }: { p: PillProfile }) => (
    <View style={styles.side} accessible accessibilityLabel={`${med(p)?.name ?? ''}. ${pillWords(lang, p.spec)}`}>
      <Backdrop radius={12} pad={6}>
        <PillGraphic spec={p.spec} size={120} />
      </Backdrop>
      <AppText lang="en" size={16} bold>{med(p)?.name}</AppText>
      <AppText lang={lang} size={14} color={theme.textMuted}>{pillWords(lang, p.spec)}</AppText>
    </View>
  );

  return (
    <Screen>
      <AppText lang={lang} size={SIZE.familyTitle} bold accessibilityRole="header">
        {t(lang, 'look.title')}
      </AppText>
      {data.pairs.length === 0 && (
        <AppText lang={lang} size={18} color={theme.taken} accessibilityLiveRegion="polite">
          {t(lang, 'look.none')}
        </AppText>
      )}
      {data.pairs.map((pair) => {
        const a = byId.get(pair.a), b = byId.get(pair.b);
        if (!a || !b) return null;
        return (
          <Section key={`${pair.a}-${pair.b}`} title={t(lang, 'look.pair')} lang={lang}>
            <View style={styles.row}>
              <Image accessibilityIgnoresInvertColors source={Assets.icons.warningLookalike} style={styles.warn} accessibilityElementsHidden />
              <AppText lang={lang} size={15} color={theme.textMuted}>{t(lang, 'look.distance', { d: pair.distance.toFixed(2) })}</AppText>
            </View>
            <View style={styles.pair}>
              <Side p={a} />
              <Side p={b} />
            </View>
            <AppText lang={lang} size={16}>{t(lang, 'look.advice')}</AppText>
          </Section>
        );
      })}
      <FamilyButton lang={lang} primary label={t(lang, 'common.next')} onPress={() => router.replace('/buddy/home')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  warn: { width: 48, height: 48 },
  pair: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  side: { flex: 1, minWidth: 140, alignItems: 'center', gap: 4 },
});
