import { unpackCalibration } from '@mathaka/core';
import { getRepository, resetDemoData } from '../db/bootstrap';
import { approve, markChanged, setCalibrator } from '../services/calibrationService';
import { applyCalibration, exportCalibration, importedInfo } from '../services/calibrationSync';
import { deliverAlert, getLink } from '../services/linkService';
import { useAppStore } from '../store/appStore';

// fileBytes touches the phone's file system; keep the test in memory
let shared: Uint8Array | null = null;
jest.mock('../services/fileBytes', () => ({
  readBytes: async () => Uint8Array.from([1, 2, 3]),
  writeAppFile: (folder: string, name: string) => `mem://${folder}/${name}`,
  shareBytes: async (_n: string, bytes: Uint8Array) => {
    shared = bytes;
  },
}));

beforeEach(async () => {
  await resetDemoData();
  shared = null;
});

test('export needs an approved calibration; import replaces it and keeps the dose log', async () => {
  const repo = await getRepository();
  await setCalibrator('p-kumari');
  await markChanged('test change'); // clears the approval
  await expect(exportCalibration()).rejects.toThrow(/second person/);
  await approve('p-nimal');

  const out = await exportCalibration();
  expect(shared).not.toBeNull();
  expect(out.code).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);

  // "elder phone": same repo for the test; remember the log size first
  const eventsBefore = (await repo.listDoseEvents('0000', '9999')).length;
  const r = unpackCalibration(shared!, 0);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const info = await applyCalibration(r);
  expect(info.code).toBe(out.code);
  expect((await repo.listMedicines()).length).toBe(4);
  expect((await repo.listDoseEvents('0000', '9999')).length).toBe(eventsBefore);
  expect((await importedInfo())?.version).toBe(out.version);

  // the same file again is "older or same version": refused
  const again = unpackCalibration(shared!, (await importedInfo())!.version);
  expect(again.ok).toBe(false);
});

test('alerts: same phone -> nothing to send; demo mode keeps SMS off', async () => {
  const link = await getLink();
  expect(link.smsEnabled).toBe(false); // demo numbers are fake
  useAppStore.setState({ role: 'family' });
  const alert = { id: 'al-x', kind: 'missed' as const, date: '2026-10-02', slot: 'noon' as const, createdAt: 'x', readAt: null };
  expect(await deliverAlert(alert)).toBe('local');
  useAppStore.setState({ role: 'elder' });
  // not paired and SMS off -> stays pending (retried later), never throws
  expect(await deliverAlert(alert)).toBe('pending');
  const saved = (await (await getRepository()).listAlerts()).find((a) => a.id === 'al-x');
  expect(saved?.data?.delivered).toBe('pending');
  useAppStore.setState({ role: null });
});
