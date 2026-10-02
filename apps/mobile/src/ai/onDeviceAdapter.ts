import {
  checkOptions,
  decideSchema,
  decisionFromLabel,
  pillWords,
  prompt,
  runJsonTask,
  type AiAdapter,
  type Decision,
  type DecisionEngine,
  type ImprintResult,
  type PillSpec,
  type PrescriptionDraft,
  type Prompt,
  type WeeklySummaryInput,
} from '@mathaka/core';
import type { LlamaContext } from 'llama.rn';
import { useAppStore } from '../store/appStore';
import { toFileUri } from './imageFile';
import { llamaModule } from './llamaRuntime';
import type { ModelSpec } from './models';

const LANG_NAME = { si: 'Sinhala', ta: 'Tamil', en: 'English' } as const;
/** Give the RAM back after this long without a request. */
const RELEASE_AFTER_MS = 90_000;

export class NeedsDevBuildError extends Error {
  constructor() {
    super('On-device AI needs the Mathaka dev or preview build (not Expo Go, not web).');
  }
}

/**
 * Gemma (or another vision GGUF) running on THIS phone through llama.rn.
 * Heavy AI once, on the family phone only: it refuses to load on the elder phone.
 */
export class OnDeviceAdapter implements AiAdapter {
  readonly kind = 'on-device' as const;
  readonly decisions: DecisionEngine;
  private ctx: LlamaContext | null = null;
  private loading: Promise<LlamaContext> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    readonly model: ModelSpec,
    private readonly paths: string[],
  ) {
    const self = this;
    this.decisions = {
      name: `gemma-on-device:${model.id}`,
      async choose(state, question, options) {
        return self.decide(state, question, options);
      },
      async yesNo(state, question) {
        return self.decide(state, question, ['yes', 'no', 'unsure']);
      },
    };
  }

  private async context(): Promise<LlamaContext> {
    if (useAppStore.getState().role === 'elder') throw new Error('Gemma is not used on the elder phone.');
    if (this.ctx) return this.ctx;
    this.loading ??= (async () => {
      const llama = llamaModule();
      if (!llama) throw new NeedsDevBuildError();
      const [modelPath, mmprojPath] = this.paths;
      const ctx = await llama.initLlama({ model: modelPath!, n_ctx: 4096, n_gpu_layers: 0, use_mlock: false, n_threads: 4 });
      if (mmprojPath) await ctx.initMultimodal({ path: mmprojPath, use_gpu: false, image_max_tokens: 512 });
      this.ctx = ctx;
      return ctx;
    })();
    try {
      return await this.loading;
    } finally {
      this.loading = null;
    }
  }

  private scheduleRelease(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.release(), RELEASE_AFTER_MS);
  }

  async release(): Promise<void> {
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx) await ctx.release();
  }

  private generate(image?: string) {
    return async (p: Prompt): Promise<string> => {
      const ctx = await this.context();
      const content = image
        ? [
            { type: 'text', text: p.user },
            { type: 'image_url', image_url: { url: toFileUri(image) } },
          ]
        : p.user;
      const res = await ctx.completion({
        messages: [
          { role: 'system', content: p.system },
          { role: 'user', content },
        ],
        response_format: { type: 'json_schema', json_schema: { strict: true, schema: p.schema } },
        n_predict: p.max_tokens,
        temperature: 0.1,
      });
      this.scheduleRelease();
      return res.text;
    };
  }

  extractPrescription(imageUri: string): Promise<PrescriptionDraft> {
    const p = prompt('extract_prescription');
    return runJsonTask('extract_prescription', p, this.generate(imageUri));
  }

  readImprint(cropUri: string): Promise<ImprintResult> {
    const p = prompt('pill_imprint');
    return runJsonTask('pill_imprint', p, this.generate(cropUri));
  }

  async describePill(imageUri: string, spec: PillSpec): Promise<string> {
    const p = prompt('describe_pill', { attributes: pillWords('en', spec) });
    return (await runJsonTask('describe_pill', p, this.generate(imageUri))).description;
  }

  async weeklySummary(input: WeeklySummaryInput): Promise<string> {
    const p = prompt('weekly_summary', { language: LANG_NAME[input.lang], name: input.elderName, facts: input.facts.map((f) => `- ${f}`).join('\n') });
    return (await runJsonTask('weekly_summary', p, this.generate())).sentences.join(' ');
  }

  private async decide(state: string, question: string, options: string[]): Promise<Decision> {
    checkOptions(options);
    const base = prompt('decide', { state, question, options: options.join(', ') });
    const out = await runJsonTask('decide', { ...base, schema: decideSchema(options) }, this.generate());
    return decisionFromLabel(out, options);
  }
}
