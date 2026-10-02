import { router } from 'expo-router';
import { Assets } from '../../../assets/generated';
import { ElderButton } from '../../components/elder/ElderButton';
import { ElderScreen } from '../../components/elder/ElderScreen';
import { MessageCard } from '../../components/elder/MessageCard';
import { useElderView } from '../../hooks/useElderView';
import { t } from '../../i18n';
import { askDidITake } from '../../services/doseService';
import { useAppStore } from '../../store/appStore';

/**
 * Shows (and says) the last answer. Same calm words every time.
 * Goes home by itself after 2 minutes without a touch.
 */
export default function AnswerScreen() {
  const { view } = useElderView();
  const message = useAppStore((s) => s.elderMessage);
  if (!view || !message) return null;
  const lang = view.ctx.lang;

  const again = async () => {
    useAppStore.getState().setElderMessage(await askDidITake('button'));
  };

  return (
    <ElderScreen
      lang={lang}
      now={view.now}
      actions={
        <>
          <ElderButton lang={lang} label={t(lang, 'elder.btn.home')} onPress={() => router.replace('/elder')} testID="answer-home" />
          <ElderButton
            lang={lang}
            variant="secondary"
            label={t(lang, 'elder.btn.didITake')}
            hint={t(lang, 'elder.btn.didITakeHint')}
            icon={Assets.icons.askDidITake}
            onPress={again}
          />
        </>
      }
    >
      <MessageCard
        lang={lang}
        text={message.text}
        autoSpeak
        // A face is easier to recognise than a name ("I will ask Nimal").
        picture={message.tone === 'ask_family' ? Assets.icons.family : message.tone === 'done' ? Assets.icons.statusTaken : undefined}
      />
    </ElderScreen>
  );
}
