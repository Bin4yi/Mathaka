import { resetDemoData, getRepository } from '../db/bootstrap';
import { demoClock } from '../services/clock';
import { handleBoxEvent } from '../services/doseService';

beforeEach(async () => {
  await resetDemoData();
});

test('pressing the lit slot on the box logs the dose once; a second press is stopped', async () => {
  demoClock.jumpTo(8, 10);
  const first = await handleBoxEvent({ type: 'PRESS', slot: 'morning' });
  expect(first?.tone).toBe('done');
  const second = await handleBoxEvent({ type: 'PRESS', slot: 'morning' });
  expect(second?.text).toMatch(/8:1\d/); // "You already took your morning medicine at 8:1x"
  const repo = await getRepository();
  const ev = await repo.listDoseEvents('0000', '9999');
  expect(ev.filter((e) => e.source === 'box' && e.status === 'taken')).toHaveLength(1);
  expect(ev.filter((e) => e.source === 'box' && e.status === 'prevented_double')).toHaveLength(1);
});

test('opening another slot changes nothing for the elder and quietly tells the family', async () => {
  demoClock.jumpTo(8, 10);
  const msg = await handleBoxEvent({ type: 'LID', slot: 'night', open: true });
  expect(msg).toBeNull();
  const repo = await getRepository();
  const alerts = await repo.listAlerts();
  expect(alerts.some((a) => a.kind === 'unsure_check' && a.slot === 'night')).toBe(true);
  expect((await repo.listDoseEvents('0000', '9999')).some((e) => e.source === 'box')).toBe(false);
});
