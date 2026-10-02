import { getRepository, resetDemoData } from '../db/bootstrap';
import {
  approve,
  checkLookalikes,
  combine,
  getCalibration,
  samplePhoto,
  saveMedicineWithSchedule,
  savePillProfile,
  setCalibrator,
} from '../services/calibrationService';

jest.mock('../ai', () => {
  const { MockAiAdapter } = jest.requireActual('../ai/mockAdapter');
  const ai = new MockAiAdapter();
  return { getAi: () => ai };
});

beforeEach(async () => {
  await resetDemoData();
});

test('calibrate a new pill from 3 sample photos, find a look-alike, then a second person approves', async () => {
  const repo = await getRepository();
  await setCalibrator('p-kumari');

  // a new medicine that looks like the demo pressure pill (small pink round)
  const medicine = {
    id: 'm-new',
    name: 'Newpril',
    strength: '5 mg',
    form: 'tablet' as const,
    purpose: { si: 'අලුත් බෙහෙත', ta: 'புதிய மருந்து', en: 'new medicine' },
    receivedCount: 30,
    remainingCount: 30,
  };
  await saveMedicineWithSchedule(medicine, [{ slot: 'evening', count: 1, meal: 'after' }]);

  const spec = { shape: 'round' as const, colorA: 'pink', sizeMm: { length: 7.3, width: 7.3 } };
  const photos = [1, 2, 3].map((seed) => samplePhoto(spec, seed));
  for (const p of photos) expect(p.analysis.features).not.toBeNull();
  const combined = combine(photos)!;
  expect(combined.spec.shape).toBe('round');
  expect(combined.spec.colorA).toBe('pink');
  expect(combined.spec.sizeMm!.length).toBeCloseTo(7.3, 0);

  const startedAt = Date.now() - 42_000;
  const profile = await savePillProfile({ medicine, spec: combined.spec, description: 'small pink round tablet', photos, startedAt });
  expect(profile.version).toBe(1);
  expect(profile.calibratedBy).toBe('p-kumari');

  // a change clears the old approval
  let cal = await getCalibration();
  expect(cal.approvedBy).toBeNull();

  // look-alike with the demo pressure pill
  const { pairs } = await checkLookalikes();
  expect(pairs.some((p) => [p.a, p.b].includes(profile.id) && [p.a, p.b].includes('pp-pressure'))).toBe(true);

  // the same person cannot approve their own work
  await expect(approve('p-kumari')).rejects.toThrow(/different person/);
  await approve('p-nimal');
  cal = await getCalibration();
  expect(cal.approvedBy).toBe('p-nimal');
  expect((await repo.listPillProfiles()).every((p) => p.approvedBy === 'p-nimal')).toBe(true);

  // the audit log has the calibration time and the approval
  const audit = await repo.listAudit();
  expect(audit.some((a) => a.action === 'pill_calibrated' && /in 4\d s/.test(a.details ?? ''))).toBe(true);
  expect(audit.some((a) => a.action === 'calibration_approved' && a.actor === 'p-nimal')).toBe(true);
});
