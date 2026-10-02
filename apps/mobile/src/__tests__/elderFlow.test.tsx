import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ElderAnswer from '../app/elder/answer';
import ElderConfirm from '../app/elder/confirm';
import ElderDose from '../app/elder/dose';
import ElderHome from '../app/elder/index';
import PillFull from '../app/elder/pill/[id]';
import { getRepository } from '../db/bootstrap';
import { demoClock } from '../services/clock';
import { confirmTaken } from '../services/doseService';

const ROUTES = {
  'elder/index': ElderHome,
  'elder/dose': ElderDose,
  'elder/confirm': ElderConfirm,
  'elder/answer': ElderAnswer,
  'elder/pill/[id]': PillFull,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
    {children}
  </SafeAreaProvider>
);

/** Every touchable on the screen must have a label (TalkBack). */
function expectAllButtonsLabelled() {
  // native host views that react to touch (what TalkBack actually sees)
  const touchables = screen.UNSAFE_root.findAll(
    (n) => typeof n.type === 'string' && (typeof n.props.onClick === 'function' || typeof n.props.onResponderRelease === 'function'),
  );
  expect(touchables.length).toBeGreaterThan(0);
  const unlabelled = touchables.filter((b) => !(typeof b.props.accessibilityLabel === 'string' && b.props.accessibilityLabel.length > 0));
  expect(unlabelled.map((b) => `${String(b.type)} ${b.props.testID ?? ''}`)).toEqual([]);
}

async function tap(testID: string) {
  // the tap guard ignores taps < 1.5 s apart; move real time on between taps
  jest.advanceTimersByTime(2000);
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
});
afterAll(() => jest.useRealTimers());

test('morning dose: show medicine, take it, confirm, then the double-dose guard', async () => {
  demoClock.jumpTo(8, 10);
  const repo = await getRepository();
  const elder = (await repo.getElder())!;
  await repo.saveElder({ ...elder, language: 'en' });
  renderRouter(ROUTES, { initialUrl: '/elder', wrapper });

  // Home: due now, two buttons
  await screen.findByTestId('show-medicine');
  expectAllButtonsLabelled();

  // Dose screen: only morning pills (3 in the demo)
  await tap('show-medicine');
  await screen.findByTestId('took-it');
  expect(screen.getAllByLabelText(/tablet/i).length).toBeGreaterThanOrEqual(3);
  expectAllButtonsLabelled();

  // Confirm step
  await tap('took-it');
  await screen.findByTestId('confirm-yes');
  expectAllButtonsLabelled();
  await tap('confirm-yes');
  await screen.findByTestId('answer-home');
  expectAllButtonsLabelled();

  const today = await repo.listDoseEvents('0000', '9999');
  expect(today.filter((e) => e.source === 'button' && e.status === 'taken')).toHaveLength(1);

  // "Did I take my medicine?" from the log
  await tap('answer-home');
  await screen.findByTestId('did-i-take');
  await tap('did-i-take');
  await waitFor(() => expect(screen.getByText(/You took your morning medicine/)).toBeTruthy());

  // Home no longer offers the morning pills; a second "I took it" (e.g. from the BLE box) is stopped.
  expect(screen.queryByTestId('show-medicine')).toBeNull();
  const second = await confirmTaken('box');
  expect(second.text).toMatch(/^You already took your morning medicine at 8:1\d\./);
  const after = await repo.listDoseEvents('0000', '9999');
  expect(after.filter((e) => e.source !== 'seed' && e.status === 'taken')).toHaveLength(1);
  expect(after.filter((e) => e.source !== 'seed' && e.status === 'prevented_double')).toHaveLength(1);
});

test('every elder screen is labelled when nothing is due', async () => {
  demoClock.jumpTo(6, 0);
  renderRouter(ROUTES, { initialUrl: '/elder', wrapper });
  await screen.findByTestId('did-i-take');
  expect(screen.queryByTestId('show-medicine')).toBeNull();
  expectAllButtonsLabelled();
});
