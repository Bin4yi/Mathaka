import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { packCalibration, shortCode, unpackCalibration, type CalibrationData } from './calibrationFile';
import { buildDemoData } from './seed';

const demo = buildDemoData(new Date(2026, 9, 2, 9));
const photo = Uint8Array.from([1, 2, 3, 4, 5]);
const data: CalibrationData = {
  elder: demo.elder,
  people: demo.people,
  medicines: demo.medicines,
  pillProfiles: demo.pillProfiles.map((p, i) => ({ ...p, photoPaths: i === 0 ? ['photos/a.jpg'] : [] })),
  schedule: demo.schedule,
  lookalikes: [],
  voiceClips: [],
};
const meta = { calibrationVersion: 3, createdAt: '2026-10-02T10:00:00Z', calibratedBy: 'p-kumari', approvedBy: 'p-nimal', approvedAt: '2026-10-02T09:00:00Z' };

test('pack -> unpack round trip, same bytes every time', () => {
  const a = packCalibration({ data, files: { 'photos/a.jpg': photo }, meta });
  const b = packCalibration({ data, files: { 'photos/a.jpg': photo }, meta });
  assert.equal(a.sha256, b.sha256);
  const r = unpackCalibration(a.bytes, 2);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.data.elder.preferredName, 'Ammi');
    assert.deepEqual(r.files['photos/a.jpg'], photo);
    assert.equal(r.manifest.calibrationVersion, 3);
  }
  assert.match(shortCode(a.sha256), /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
});

test('an unapproved calibration cannot be packed', () => {
  assert.throws(() => packCalibration({ data, files: { 'photos/a.jpg': photo }, meta: { ...meta, approvedBy: null } }), /second person/);
});

test('older or same version is rejected', () => {
  const { bytes } = packCalibration({ data, files: { 'photos/a.jpg': photo }, meta });
  const r = unpackCalibration(bytes, 3);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, 'older_version');
});

test('a changed photo is detected (broken file)', () => {
  const { bytes } = packCalibration({ data, files: { 'photos/a.jpg': photo }, meta });
  const entries = unzipSync(bytes);
  entries['photos/a.jpg'] = Uint8Array.from([9, 9, 9]);
  const r = unpackCalibration(zipSync(entries), 0);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, 'broken');
});

test('random zip / random bytes are rejected', () => {
  const r1 = unpackCalibration(zipSync({ 'hello.txt': strToU8('hi') }), 0);
  assert.ok(!r1.ok && r1.reason === 'not_a_calibration');
  const r2 = unpackCalibration(Uint8Array.from([1, 2, 3]), 0);
  assert.ok(!r2.ok && r2.reason === 'broken');
});
