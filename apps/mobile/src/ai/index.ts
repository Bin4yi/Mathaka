import type { AiAdapter } from '@mathaka/core';
import { getRepository } from '../db/bootstrap';
import { installedModels, modelPaths } from '../services/modelManager';
import { useAppStore } from '../store/appStore';
import { LaptopHelperAdapter } from './helperAdapter';
import { MockAiAdapter } from './mockAdapter';
import { MODELS } from './models';
import { OnDeviceAdapter } from './onDeviceAdapter';

// Screens only ever call getAi(). Which engine sits behind it is a family setting.

export type AiMode = 'mock' | 'on-device' | 'helper';
export type AiSettings = { mode: AiMode; modelId: string; helperUrl: string };
export const DEFAULT_AI: AiSettings = { mode: 'mock', modelId: MODELS[0]!.id, helperUrl: 'http://192.168.1.10:8787' };

let current: AiAdapter = new MockAiAdapter();

export function getAi(): AiAdapter {
  return current;
}

export function setAi(adapter: AiAdapter): void {
  if (current instanceof OnDeviceAdapter && current !== adapter) void current.release();
  current = adapter;
}

export async function getAiSettings(): Promise<AiSettings> {
  const repo = await getRepository();
  return { ...DEFAULT_AI, ...((await repo.getSetting<AiSettings>('ai')) ?? {}) };
}

/** Build the engine from settings. Falls back to the mock if the model is not downloaded. */
export async function applyAiSettings(next?: AiSettings): Promise<AiAdapter> {
  const repo = await getRepository();
  const s = next ?? (await getAiSettings());
  if (next) await repo.setSetting('ai', next);
  let adapter: AiAdapter = new MockAiAdapter();
  if (s.mode === 'helper' && s.helperUrl) adapter = new LaptopHelperAdapter(s.helperUrl);
  if (s.mode === 'on-device' && useAppStore.getState().role !== 'elder') {
    const model = MODELS.find((m) => m.id === s.modelId);
    if (model && (await installedModels()).includes(model.id)) adapter = new OnDeviceAdapter(model, modelPaths(model));
  }
  setAi(adapter);
  useAppStore.getState().bumpData();
  return adapter;
}
