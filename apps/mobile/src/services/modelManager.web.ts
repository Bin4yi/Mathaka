import { totalBytes, type ModelSpec } from '../ai/models';

// Web preview: no on-device models (use the mock or the laptop helper).

export const MODELS_SUPPORTED = false;
export type Progress = { file: string; phase: 'download' | 'verify'; done: number; total: number };

export function deviceRamGb(): number | null {
  const mem = (globalThis.navigator as { deviceMemory?: number } | undefined)?.deviceMemory;
  return mem ?? null;
}
export function freeSpaceBytes(): number | null {
  return null;
}
export async function installedModels(): Promise<string[]> {
  return [];
}
export function modelPaths(_m: ModelSpec): string[] {
  return [];
}
export async function downloadModel(_m: ModelSpec, _p: (p: Progress) => void): Promise<void> {
  throw new Error('On-device models are not available in the web preview.');
}
export async function deleteModel(_m: ModelSpec): Promise<void> {}
export function needsBytes(m: ModelSpec): number {
  return totalBytes(m);
}
