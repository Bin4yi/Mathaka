import {
  analyzePillPhoto,
  bmpDataUri,
  combinePhotos,
  cropImage,
  findLookalikes,
  synthPhoto,
  type CombinedLook,
  type Medicine,
  type PillAnalysis,
  type PillProfile,
  type PillSpec,
  type ScheduleItem,
} from '@mathaka/core';
import { getAi } from '../ai';
import { getRepository } from '../db/bootstrap';
import { useAppStore } from '../store/appStore';
import { clock } from './clock';
import { newId } from './ids';
import { keepPhoto, loadPixels, type Photo } from './photos';

/** One calibration of the whole medicine list. Any change clears the approval. */
export type CalibrationState = {
  version: number;
  calibratedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  changedAt: string | null;
};

const KEY = 'calibration';
const EMPTY: CalibrationState = { version: 0, calibratedBy: null, approvedBy: null, approvedAt: null, changedAt: null };

export async function getCalibration(): Promise<CalibrationState> {
  const repo = await getRepository();
  const saved = await repo.getSetting<CalibrationState>(KEY);
  if (saved) return saved;
  // demo data comes pre-approved (calibrated by Kumari, approved by Nimal)
  const profiles = await repo.listPillProfiles();
  if (profiles.length && profiles.every((p) => p.approvedBy)) {
    return { version: 1, calibratedBy: profiles[0]!.calibratedBy ?? null, approvedBy: profiles[0]!.approvedBy ?? null, approvedAt: null, changedAt: null };
  }
  return EMPTY;
}

async function audit(action: string, details?: string): Promise<void> {
  const repo = await getRepository();
  const state = await getCalibration();
  await repo.addAudit({ id: newId('au'), at: clock.now().toISOString(), actor: state.calibratedBy ?? 'unknown', action, details });
}

/** Something in the calibration changed: new version, needs a second-person check again. */
export async function markChanged(what: string): Promise<void> {
  const repo = await getRepository();
  const s = await getCalibration();
  await repo.setSetting<CalibrationState>(KEY, { ...s, version: s.version + 1, approvedBy: null, approvedAt: null, changedAt: clock.now().toISOString() });
  await audit('calibration_changed', what);
  useAppStore.getState().bumpData();
}

export async function setCalibrator(personId: string): Promise<void> {
  const repo = await getRepository();
  const s = await getCalibration();
  await repo.setSetting<CalibrationState>(KEY, { ...s, calibratedBy: personId });
  useAppStore.getState().bumpData();
}

/** Second-person check. The approver must be a different person from the calibrator. */
export async function approve(personId: string): Promise<void> {
  const repo = await getRepository();
  const s = await getCalibration();
  if (!s.calibratedBy) throw new Error('No one is set as the person who calibrated');
  if (personId === s.calibratedBy) throw new Error('The approver must be a different person');
  const at = clock.now().toISOString();
  for (const p of await repo.listPillProfiles()) await repo.savePillProfile({ ...p, approvedBy: personId });
  await repo.setSetting<CalibrationState>(KEY, { ...s, approvedBy: personId, approvedAt: at });
  await repo.addAudit({ id: newId('au'), at, actor: personId, action: 'calibration_approved', details: `version ${s.version}` });
  useAppStore.getState().bumpData();
}

// ---------- medicines + schedule ----------

export async function saveMedicineWithSchedule(medicine: Medicine, items: Omit<ScheduleItem, 'id' | 'medicineId'>[]): Promise<void> {
  const repo = await getRepository();
  await repo.saveMedicine(medicine);
  for (const old of (await repo.listSchedule()).filter((s) => s.medicineId === medicine.id)) await repo.deleteScheduleItem(old.id);
  for (const it of items) await repo.saveScheduleItem({ ...it, id: newId('s'), medicineId: medicine.id });
  await markChanged(`medicine ${medicine.name}`);
}

// ---------- pill photos ----------

/** cropUri: the pill cut out of the straightened mat (for the review screen and the imprint). */
export type AnalyzedPhoto = { uri: string; analysis: PillAnalysis; ms: number; cropUri?: string };

function pillCrop(a: PillAnalysis): string | undefined {
  return a.crop ? bmpDataUri(cropImage(a.view, a.crop)) : undefined;
}

export async function analyzePhoto(photo: Photo): Promise<AnalyzedPhoto> {
  const t0 = Date.now();
  const pixels = await loadPixels(photo);
  const analysis = analyzePillPhoto(pixels);
  return { uri: photo.uri, analysis, ms: Date.now() - t0, cropUri: pillCrop(analysis) };
}

/**
 * Web preview / demo only: a synthetic photo of a pill on the mat, so calibration can be
 * tried on a laptop without a camera. Clearly a test image, never used on real elders.
 */
export function samplePhoto(spec: PillSpec, seed: number): AnalyzedPhoto {
  const t0 = Date.now();
  const img = synthPhoto(spec, { width: 640, height: 480, seed, rotateDeg: 6 - seed * 3, tilt: 0.05, pillAngleDeg: 20 * seed, light: seed === 3 ? [1.08, 1, 0.82] : [1, 1, 1] });
  const analysis = analyzePillPhoto(img);
  return { uri: bmpDataUri(img), analysis, ms: Date.now() - t0, cropUri: pillCrop(analysis) };
}

export function combine(photos: AnalyzedPhoto[]): CombinedLook | null {
  return combinePhotos(photos.map((p) => p.analysis.features).filter((f): f is NonNullable<typeof f> => !!f));
}

/** Ask the AI (Gemma on device / helper / mock) for the imprint and a plain description. */
export async function readImprintAndDescribe(photo: AnalyzedPhoto, spec: PillSpec): Promise<{ imprint: string; description: string }> {
  const ai = getAi();
  let imprint = '';
  if (photo.cropUri) {
    const r = await ai.readImprint(photo.cropUri);
    imprint = r.confidence >= 0.6 ? r.text : ''; // low confidence -> empty, the Buddy can type it
  }
  const description = await ai.describePill(photo.uri, { ...spec, imprint });
  return { imprint, description };
}

export async function savePillProfile(input: {
  medicine: Medicine;
  spec: PillSpec;
  description: string;
  photos: AnalyzedPhoto[];
  startedAt: number;
}): Promise<PillProfile> {
  const repo = await getRepository();
  const state = await getCalibration();
  const old = (await repo.listPillProfiles()).filter((p) => p.medicineId === input.medicine.id);
  const version = Math.max(0, ...old.map((p) => p.version)) + 1;
  const id = newId('pp');
  const photoPaths = input.photos.map((p, i) => keepPhoto(p.uri, `${id}-${i + 1}.${p.uri.startsWith('data:image/bmp') ? 'bmp' : 'jpg'}`));
  const profile: PillProfile = {
    id,
    medicineId: input.medicine.id,
    spec: input.spec,
    description: input.description,
    photoPaths,
    calibratedBy: state.calibratedBy ?? undefined,
    version,
  };
  await repo.savePillProfile(profile);
  const seconds = Math.round((Date.now() - input.startedAt) / 1000);
  await audit('pill_calibrated', `${input.medicine.name} v${version} in ${seconds} s`);
  await markChanged(`pill ${input.medicine.name}`);
  return profile;
}

/** Newest profile per medicine. */
export async function currentProfiles(): Promise<PillProfile[]> {
  const repo = await getRepository();
  const best = new Map<string, PillProfile>();
  for (const p of await repo.listPillProfiles()) {
    const old = best.get(p.medicineId);
    if (!old || p.version > old.version) best.set(p.medicineId, p);
  }
  return [...best.values()];
}

export async function checkLookalikes() {
  const repo = await getRepository();
  const profiles = await currentProfiles();
  const pairs = findLookalikes(profiles);
  for (const p of pairs) {
    await repo.saveLookalike({ id: `la-${[p.a, p.b].sort().join('-')}`, profileA: p.a, profileB: p.b, distance: p.distance });
  }
  return { pairs, profiles };
}
