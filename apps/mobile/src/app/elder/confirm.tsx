import { elderText } from '@mathaka/core';
import { router } from 'expo-router';
import { Assets } from '../../../assets/generated';
import { ElderButton } from '../../components/elder/ElderButton';
import { ElderScreen } from '../../components/elder/ElderScreen';
import { MessageCard } from '../../components/elder/MessageCard';
import { useElderView } from '../../hooks/useElderView';
import { t } from '../../i18n';
import { confirmTaken } from '../../services/doseService';
import { useAppStore } from '../../store/appStore';

/** One calm check to avoid accidental logs: "Did you swallow the pills now?" */
export default function ConfirmScreen() {
  const { view } = useElderView();
  if (!view) return null;
  const lang = view.ctx.lang;

  const yes = async () => {
    useAppStore.getState().setElderMessage(await confirmTaken('button'));
    router.replace('/elder/answer');
  };

  return (
    <ElderScreen
      lang={lang}
      now={view.now}
      actions={
        <>
          <ElderButton lang={lang} label={t(lang, 'elder.btn.yes')} icon={Assets.icons.statusTaken} onPress={yes} testID="confirm-yes" />
          <ElderButton lang={lang} variant="secondary" label={t(lang, 'elder.btn.notYet')} onPress={() => router.back()} />
        </>
      }
    >
      <MessageCard lang={lang} text={elderText(view.ctx, 'confirm.question')} autoSpeak />
    </ElderScreen>
  );
}
