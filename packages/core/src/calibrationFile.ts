import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { z } from 'zod';
import { sha256Hex } from './sha256';

// The calibration travels from the family phone to the elder phone as ONE file:
// mathaka-calibration.mtk = zip { manifest.json, data.json, photos/*, voice/* }.
// The manifest lists a SHA-256 for every other file; the elder phone checks all of them.

export const CALIBRATION_FORMAT = 'mathaka-calibration';
export const CALIBRATION_FORMAT_VERSION = 1;

const Lang = z.enum(['si', 'ta', 'en']);
const SlotZ = z.enum(['morning', 'noon', 'evening', 'night']);
const Spec = z.object({
  shape: z.enum(['round', 'oval', 'oblong', 'capsule', 'diamond', 'triangle']),
  colorA: z.string(),
  colorB: z.string().optional(),
  split: z.enum(['none', 'vertical', 'horizontal']).optional(),
  score: z.boolean().optional(),
  imprint: z.string().optional(),
  sizeMm: z.object({ length: z.number(), width: z.number() }).optional(),
});

export const CalibrationDataSchema = z.object({
  elder: z.object({
    id: z.string(),
    preferredName: z.string().min(1),
    language: Lang,
    times: z.object({ wake: z.string(), breakfast: z.string(), lunch: z.string(), dinner: z.string(), sleep: z.string() }),
    a11y: z.object({
      fontScale: z.number(),
      highContrast: z.boolean(),
      hearing: z.boolean(),
      tremor: z.boolean(),
      screenReader: z.boolean(),
      confirmTaken: z.boolean(),
    }),
  }),
  people: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.enum(['buddy', 'family']),
      relation: z.string().optional(),
      phone: z.string().optional(),
      photoPath: z.string().optional(),
      photoAsset: z.string().optional(),
    }),
  ),
  medicines: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      strength: z.string(),
      form: z.enum(['tablet', 'capsule', 'liquid', 'other']),
      purpose: z.object({ si: z.string(), ta: z.string(), en: z.string() }),
      receivedCount: z.number(),
      remainingCount: z.number(),
    }),
  ),
  pillProfiles: z.array(
    z.object({
      id: z.string(),
      medicineId: z.string(),
      spec: Spec,
      description: z.string(),
      /** paths INSIDE the zip, e.g. photos/pp-1-1.jpg */
      photoPaths: z.array(z.string()),
      assetKey: z.string().optional(),
      calibratedBy: z.string().optional(),
      approvedBy: z.string().optional(),
      version: z.number(),
    }),
  ),
  schedule: z.array(z.object({ id: z.string(), medicineId: z.string(), slot: SlotZ, count: z.number().positive(), meal: z.enum(['before', 'after', 'any']) })),
  lookalikes: z.array(z.object({ id: z.string(), profileA: z.string(), profileB: z.string(), distance: z.number(), note: z.string().optional() })),
  voiceClips: z.array(z.object({ id: z.string(), phraseKey: z.string(), lang: Lang, path: z.string(), recordedBy: z.string(), consentAt: z.string() })),
});
export type CalibrationData = z.infer<typeof CalibrationDataSchema>;

const ManifestSchema = z.object({
  format: z.literal(CALIBRATION_FORMAT),
  formatVersion: z.number().int(),
  calibrationVersion: z.number().int().nonnegative(),
  createdAt: z.string(),
  calibratedBy: z.string().nullable(),
  approvedBy: z.string(),
  approvedAt: z.string().nullable(),
  files: z.record(z.string(), z.string().regex(/^[0-9a-f]{64}$/)),
});
export type CalibrationManifest = z.infer<typeof ManifestSchema>;

export type PackInput = {
  data: CalibrationData;
  /** zip path -> bytes (photos/..., voice/...) */
  files: Record<string, Uint8Array>;
  meta: { calibrationVersion: number; createdAt: string; calibratedBy: string | null; approvedBy: string | null; approvedAt: string | null };
};

/** Build the .mtk bytes. Refuses an unapproved calibration (second-person check is required). */
export function packCalibration(input: PackInput): { bytes: Uint8Array; sha256: string; manifest: CalibrationManifest } {
  if (!input.meta.approvedBy) throw new Error('The calibration must be approved by a second person before sending.');
  const data = CalibrationDataSchema.parse(input.data);
  for (const p of data.pillProfiles) for (const path of p.photoPaths) if (!input.files[path]) throw new Error(`missing photo ${path}`);
  const entries: Record<string, Uint8Array> = { 'data.json': strToU8(JSON.stringify(data)), ...input.files };
  const files: Record<string, string> = {};
  for (const [path, bytes] of Object.entries(entries)) files[path] = sha256Hex(bytes);
  const manifest: CalibrationManifest = {
    format: CALIBRATION_FORMAT,
    formatVersion: CALIBRATION_FORMAT_VERSION,
    calibrationVersion: input.meta.calibrationVersion,
    createdAt: input.meta.createdAt,
    calibratedBy: input.meta.calibratedBy,
    approvedBy: input.meta.approvedBy,
    approvedAt: input.meta.approvedAt,
    files,
  };
  // fixed mtime so the same calibration always gives the same bytes (and the same hash)
  const opts = { mtime: new Date('2026-01-01T00:00:00Z') };
  const zipped = zipSync(
    Object.fromEntries([['manifest.json', strToU8(JSON.stringify(manifest, null, 2))], ...Object.entries(entries)].map(([k, v]) => [k, [v, opts]])),
    { level: 6 },
  );
  return { bytes: zipped, sha256: sha256Hex(zipped), manifest };
}

export type UnpackResult =
  | { ok: true; data: CalibrationData; files: Record<string, Uint8Array>; manifest: CalibrationManifest; sha256: string }
  | { ok: false; reason: 'not_a_calibration' | 'newer_format' | 'broken' | 'older_version' | 'not_approved'; detail: string };

/**
 * Read and check an .mtk file. Rejects broken files (any hash mismatch), unknown formats,
 * and versions older than (or equal to) what the elder phone already has.
 */
export function unpackCalibration(bytes: Uint8Array, currentVersion: number): UnpackResult {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch (e) {
    return { ok: false, reason: 'broken', detail: `not a zip: ${String(e)}` };
  }
  const rawManifest = entries['manifest.json'];
  if (!rawManifest) return { ok: false, reason: 'not_a_calibration', detail: 'no manifest.json' };
  let manifest: CalibrationManifest;
  try {
    const parsed = JSON.parse(strFromU8(rawManifest)) as { format?: string; formatVersion?: number };
    if (parsed.format !== CALIBRATION_FORMAT) return { ok: false, reason: 'not_a_calibration', detail: String(parsed.format) };
    if ((parsed.formatVersion ?? 0) > CALIBRATION_FORMAT_VERSION) return { ok: false, reason: 'newer_format', detail: `format ${parsed.formatVersion}` };
    manifest = ManifestSchema.parse(parsed);
  } catch (e) {
    return { ok: false, reason: 'broken', detail: `bad manifest: ${String(e)}` };
  }
  for (const [path, hash] of Object.entries(manifest.files)) {
    const b = entries[path];
    if (!b) return { ok: false, reason: 'broken', detail: `missing ${path}` };
    if (sha256Hex(b) !== hash) return { ok: false, reason: 'broken', detail: `changed ${path}` };
  }
  for (const path of Object.keys(entries)) {
    if (path !== 'manifest.json' && !manifest.files[path]) return { ok: false, reason: 'broken', detail: `unexpected ${path}` };
  }
  if (!manifest.approvedBy) return { ok: false, reason: 'not_approved', detail: 'no second-person approval' };
  if (manifest.calibrationVersion <= currentVersion) {
    return { ok: false, reason: 'older_version', detail: `file v${manifest.calibrationVersion}, phone has v${currentVersion}` };
  }
  const parsedData = CalibrationDataSchema.safeParse(JSON.parse(strFromU8(entries['data.json']!)));
  if (!parsedData.success) return { ok: false, reason: 'broken', detail: parsedData.error.message.slice(0, 200) };
  const { 'manifest.json': _m, 'data.json': _d, ...files } = entries;
  return { ok: true, data: parsedData.data, files, manifest, sha256: sha256Hex(bytes) };
}

/** Short code people can compare by eye (family QR vs elder screen): 4 groups of 4. */
export function shortCode(sha256: string): string {
  return sha256.slice(0, 16).toUpperCase().match(/.{4}/g)!.join('-');
}
