import type { AiAdapter } from '@mathaka/core';
import { MockAiAdapter } from './mockAdapter';

// M1: only the mock exists. OnDevice (llama.rn + onnxruntime) comes in M5/M7,
// LaptopHelper (HTTP to helper/) in M5. Screens must only use getAi().
let current: AiAdapter = new MockAiAdapter();

export function getAi(): AiAdapter {
  return current;
}

export function setAi(adapter: AiAdapter): void {
  current = adapter;
}
