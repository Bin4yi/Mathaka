import { clockText, minutesOfDay } from '@mathaka/core';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Assets } from '../../../assets/generated';
import { SIZE } from '../../a11y/tokens';
import { AnalogClock } from '../../components/AnalogClock';
import { AppText } from '../../components/AppText';
import { ElderButton } from '../../components/elder/ElderButton';
import { ElderScreen } from '../../components/elder/ElderScreen';
import { MessageCard } from '../../components/elder/MessageCard';
import { VirtualPillBox } from '../../components/elder/VirtualPillBox';
import { useElderView } from '../../hooks/useElderView';
import { t } from '../../i18n';
import { askDidITake, homeMessage } from '../../services/doseService';
import { useAppStore } from '../../store/appStore';

/** Elder home. One message, a clock, the pill box, and at most two big buttons. */
export default function ElderHome() {
  const { view } = useElderView();
  if (!view) return null;
  const lang = view.ctx.lang;

  const didITake = async () => {
    useAppStore.getState().setElderMessage(await askDidITake('button'));
    router.push('/elder/answer');
  };

  return (
    <ElderScreen
      lang={lang}
      now={view.now}
      idleHome={false}
      actions={
        <>
          {view.open && (
            <ElderButton
              lang={lang}
              label={t(lang, 'elder.btn.showMedicine')}
              hint={t(lang, 'elder.btn.showMedicineHint')}
              icon={Assets.illustrations[`pillboxOpen${cap(view.open.slot)}` as const]}
              onPress={() => router.push('/elder/dose')}
              testID="show-medicine"
            />
          )}
          <ElderButton
            lang={lang}
            variant={view.open ? 'secondary' : 'primary'}
            label={t(lang, 'elder.btn.didITake')}
            hint={t(lang, 'elder.btn.didITakeHint')}
            icon={Assets.icons.askDidITake}
            onPress={didITake}
            testID="did-i-take"
          />
        </>
      }
    >
      <MessageCard lang={lang} text={homeMessage(view)} />

      <View style={styles.clockRow} accessible accessibilityLabel={t(lang, 'elder.timeNow', { time: clockText(minutesOfDay(view.now)) })}>
        <AnalogClock date={view.now} size={150} />
        <AppText lang="en" size={SIZE.elderMain} bold>
          {clockText(minutesOfDay(view.now))}
        </AppText>
      </View>

      <VirtualPillBox lang={lang} states={view.states} lit={view.open?.slot ?? null} />
    </ElderScreen>
  );
}

function cap<S extends string>(s: S): Capitalize<S> {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<S>;
}

const styles = StyleSheet.create({
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: SIZE.gap, flexWrap: 'wrap' },
});
