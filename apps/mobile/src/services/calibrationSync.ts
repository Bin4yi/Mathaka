import {
  base64ToBytes,
  packCalibration,
  shortCode,
  unpackCalibration,
  type CalibrationData,
  type UnpackResult,
} from '@mathaka/core';
import * as DocumentPicker from 'expo-document-picker';
import { getRepository } from '../db/bootstrap';
import { useAppStore } from '../store/appStore';
import { currentProfiles, getCalibration } from './calibrationService';
import { clock } from './clock';
import { readBytes, shareBytes, writeAppFile } from './fileBytes';
import { newId } from './ids';

// Calibration: family phone -> one .mtk file -> elder phone (any way: Bluetooth, USB,
// WhatsApp-to-self...). The elder phone checks every SHA-256 before using anything.

export type ExportResult = { name: string; sha256: string; code: string; version: number; bytes: number };
export type ImportedInfo = { version: number; sha256: string; code: string; importedAt: string };

const IMPORTED_KEY = 'importedCalibration';

function ext(uri: string): string {
  if (uri.startsWith('data:image/bmp')) return 'bmp';
  if (uri.startsWith('data:image/png') || uri.endsWith('.png')) return 'png';
  if (uri.endsWith('.bmp')) return 'bmp';
  return 'jpg';
}

/** Build the file (only an approved calibration) and open the share sheet. */
export async function exportCalibration(share = true): Promise<ExportResult> {
  const repo = await getRepository();
  const cal = await getCalibration();
  const elder = await repo.getElder();
  if (!elder) throw new Error('No elder profile yet.');
  const profiles = await currentProfiles();
  const files: Record<string, Uint8Array> = {};
  const pillProfiles = [];
  for (const p of profiles) {
    const paths: string[] = [];
    for (const [i, uri] of p.photoPaths.entries()) {
      const path = `photos/${p.id}-${i + 1}.${ext(uri)}`;
      files[path] = await readBytes(uri);
      paths.push(path);
    }
    pillProfiles.push({ ...p, photoPaths: paths });
  }
  const voiceClips = [];
  for (const c of await repo.listVoiceClips()) {
    const path = `voice/${c.id}.m4a`;
    files[path] = await readBytes(c.path);
    voiceClips.push({ ...c, path });
  }
  const data: CalibrationData = {
    elder,
    people: await repo.listPeople(),
    medicines: await repo.listMedicines(),
    pillProfiles,
    schedule: await repo.listSchedule(),
    lookalikes: await repo.listLookalikes(),
    voiceClips,
  };
  const { bytes, sha256 } = packCalibration({
    data,
    files,
    meta: { calibrationVersion: cal.version, createdAt: clock.now().toISOString(), calibratedBy: cal.calibratedBy, approvedBy: cal.approvedBy, approvedAt: cal.approvedAt },
  });
  const name = `mathaka-calibration-v${cal.version}.mtk`;
  if (share) await shareBytes(name, bytes, 'application/octet-stream', 'Mathaka calibration');
  await repo.addAudit({ id: newId('au'), at: clock.now().toISOString(), actor: cal.calibratedBy ?? 'family', action: 'calibration_exported', details: `v${cal.version} ${shortCode(sha256)}` });
  return { name, sha256, code: shortCode(sha256), version: cal.version, bytes: bytes.length };
}

export async function importedInfo(): Promise<ImportedInfo | null> {
  return (await (await getRepository()).getSetting<ImportedInfo>(IMPORTED_KEY)) ?? null;
}

/** Apply already-checked file contents to this (elder) phone. */
export async function applyCalibration(r: Extract<UnpackResult, { ok: true }>): Promise<ImportedInfo> {
  const repo = await getRepository();
  const written: Record<string, string> = {};
  for (const [path, bytes] of Object.entries(r.files)) {
    const [folder, name] = path.split('/') as [string, string];
    written[path] = writeAppFile(folder, name, bytes);
  }
  const data: CalibrationData = {
    ...r.data,
    pillProfiles: r.data.pillProfiles.map((p) => ({ ...p, photoPaths: p.photoPaths.map((x) => written[x] ?? x) })),
    voiceClips: r.data.voiceClips.map((c) => ({ ...c, path: written[c.path] ?? c.path })),
  };
  await repo.replaceCalibration(data);
  const info: ImportedInfo = { version: r.manifest.calibrationVersion, sha256: r.sha256, code: shortCode(r.sha256), importedAt: clock.now().toISOString() };
  await repo.setSetting(IMPORTED_KEY, info);
  await repo.setSetting('calibration', {
    version: r.manifest.calibrationVersion,
    calibratedBy: r.manifest.calibratedBy,
    approvedBy: r.manifest.approvedBy,
    approvedAt: r.manifest.approvedAt,
    changedAt: r.manifest.createdAt,
  });
  await repo.addAudit({ id: newId('au'), at: info.importedAt, actor: 'elder-phone', action: 'calibration_imported', details: `v${info.version} ${info.code}` });
  useAppStore.getState().bumpData();
  return info;
}

export type ImportOutcome = { ok: true; info: ImportedInfo } | { ok: false; reason: string; detail: string } | { ok: false; reason: 'cancelled'; detail: '' };

/** Elder phone: pick the .mtk file, check it, apply it. Broken or older files are refused. */
export async function importCalibrationFromPicker(): Promise<ImportOutcome> {
  const pick = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  const asset = pick.canceled ? null : pick.assets[0];
  if (!asset) return { ok: false, reason: 'cancelled', detail: '' };
  const bytes = asset.base64 ? base64ToBytes(asset.base64) : await readBytes(asset.uri);
  const current = (await importedInfo())?.version ?? 0;
  const r = unpackCalibration(bytes, current);
  if (!r.ok) return { ok: false, reason: r.reason, detail: r.detail };
  return { ok: true, info: await applyCalibration(r) };
}
