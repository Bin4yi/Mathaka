import { Sha256 } from '@mathaka/core';
import * as Device from 'expo-device';
import { Directory, File, Paths } from 'expo-file-system';
import * as Legacy from 'expo-file-system/legacy';
import { MODELS, totalBytes, type ModelSpec } from '../ai/models';
import { getRepository } from '../db/bootstrap';
import { useAppStore } from '../store/appStore';

// Downloads open models once (on Wi-Fi), checks SHA-256, keeps them in the app's own folder.

export const MODELS_SUPPORTED = true;
const dir = () => {
  const d = new Directory(Paths.document, 'models');
  d.create({ idempotent: true });
  return d;
};
const fileFor = (name: string) => new File(dir(), name);

export type Progress = { file: string; phase: 'download' | 'verify'; done: number; total: number };

export function deviceRamGb(): number | null {
  return Device.totalMemory ? Device.totalMemory / 1024 ** 3 : null;
}

/** Free space on the phone, in bytes (null if unknown). */
export function freeSpaceBytes(): number | null {
  try {
    return Paths.availableDiskSpace;
  } catch {
    return null;
  }
}

export async function installedModels(): Promise<string[]> {
  const repo = await getRepository();
  const files = await repo.listModelFiles();
  return MODELS.filter((m) => m.files.every((f) => files.some((x) => x.name === f.name) && fileFor(f.name).exists)).map((m) => m.id);
}

export function modelPaths(m: ModelSpec): string[] {
  return m.files.map((f) => fileFor(f.name).uri);
}

/** SHA-256 of a (multi-GB) file in 4 MB chunks, so memory stays small. */
async function sha256OfFile(file: File, onProgress: (done: number) => void): Promise<string> {
  const h = new Sha256();
  const handle = file.open();
  try {
    const size = handle.size ?? file.size ?? 0;
    let done = 0;
    while (done < size) {
      const chunk = handle.readBytes(Math.min(4 * 1024 * 1024, size - done));
      if (chunk.length === 0) break;
      h.update(chunk);
      done += chunk.length;
      onProgress(done);
      // let the UI breathe between chunks
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    handle.close();
  }
  return h.digestHex();
}

const RESUME_KEY = (name: string) => `download:${name}`;

/**
 * Download every file of a model (resumes a broken download), then verify SHA-256.
 * A bad hash deletes the file and throws: we never run an unchecked model.
 */
export async function downloadModel(m: ModelSpec, onProgress: (p: Progress) => void): Promise<void> {
  const repo = await getRepository();
  for (const f of m.files) {
    const target = fileFor(f.name);
    const known = (await repo.listModelFiles()).find((x) => x.name === f.name);
    if (known && target.exists && known.sha256 === f.sha256) continue;

    const saved = await repo.getSetting<Legacy.DownloadPauseState>(RESUME_KEY(f.name));
    const task = Legacy.createDownloadResumable(
      f.url,
      target.uri,
      {},
      (p) => onProgress({ file: f.name, phase: 'download', done: p.totalBytesWritten, total: p.totalBytesExpectedToWrite || f.bytes }),
      saved?.resumeData,
    );
    // save resume data now and then, so a closed app can continue later
    const timer = setInterval(() => {
      void repo.setSetting(RESUME_KEY(f.name), task.savable());
    }, 5000);
    try {
      const res = saved?.resumeData ? await task.resumeAsync() : await task.downloadAsync();
      if (!res || res.status >= 400) throw new Error(`download failed (${res?.status ?? 'no response'})`);
    } finally {
      clearInterval(timer);
    }
    await repo.setSetting(RESUME_KEY(f.name), null);

    const hash = await sha256OfFile(new File(target.uri), (done) => onProgress({ file: f.name, phase: 'verify', done, total: f.bytes }));
    if (hash !== f.sha256) {
      new File(target.uri).delete();
      throw new Error(`${f.name}: checksum does not match. The file was deleted. Please try again on Wi-Fi.`);
    }
    await repo.saveModelFile({ name: f.name, path: target.uri, sha256: hash, size: f.bytes });
  }
  useAppStore.getState().bumpData();
}

export async function deleteModel(m: ModelSpec): Promise<void> {
  for (const f of m.files) {
    const file = fileFor(f.name);
    if (file.exists) file.delete();
  }
  useAppStore.getState().bumpData();
}

export function needsBytes(m: ModelSpec): number {
  return totalBytes(m);
}
