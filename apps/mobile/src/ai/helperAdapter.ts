import {
  checkOptions,
  DescribeSchema,
  ImprintSchema,
  pillWords,
  PrescriptionDraftSchema,
  SummarySchema,
  toDecision,
  type AiAdapter,
  type Decision,
  type DecisionEngine,
  type ImprintResult,
  type PillSpec,
  type PrescriptionDraft,
  type WeeklySummaryInput,
} from '@mathaka/core';
import { z } from 'zod';
import { toBase64 } from './imageFile';

// The optional laptop helper (helper/ FastAPI on the home Wi-Fi): same JSON contracts as
// the on-device engines. For phones that are too weak for Gemma, and for the eval.

const DecisionOut = z.object({ label: z.string(), probs: z.record(z.string(), z.number()), confidence: z.number() });

export class LaptopHelperAdapter implements AiAdapter {
  readonly kind = 'laptop-helper' as const;
  readonly decisions: DecisionEngine;

  constructor(
    readonly baseUrl: string,
    /** 'gemma' or 'laya' (M7) for the decision layer */
    decisionBackend: 'gemma' | 'laya' = 'gemma',
  ) {
    const self = this;
    this.decisions = {
      name: `helper-${decisionBackend}`,
      async choose(state, question, options) {
        checkOptions(options);
        return self.post(`/${decisionBackend}/decide`, { state, question, options }, DecisionOut).then(fix);
      },
      async yesNo(state, question) {
        return self.post(`/${decisionBackend}/decide`, { state, question, options: ['yes', 'no', 'unsure'] }, DecisionOut).then(fix);
      },
    };
  }

  private async post<S extends z.ZodTypeAny>(path: string, body: unknown, schema: S, timeoutMs = 120_000): Promise<z.output<S>> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`helper ${path}: HTTP ${res.status}`);
      return schema.parse(await res.json());
    } finally {
      clearTimeout(timer);
    }
  }

  async health(): Promise<{ ok: boolean; gemma_model?: string; laya?: boolean }> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/health`);
    return (await res.json()) as { ok: boolean };
  }

  async extractPrescription(imageUri: string): Promise<PrescriptionDraft> {
    return this.post('/gemma/extract-prescription', { image_base64: await toBase64(imageUri) }, PrescriptionDraftSchema);
  }

  async readImprint(cropUri: string): Promise<ImprintResult> {
    return this.post('/gemma/pill-imprint', { image_base64: await toBase64(cropUri) }, ImprintSchema);
  }

  async describePill(imageUri: string, spec: PillSpec): Promise<string> {
    const out = await this.post('/gemma/describe-pill', { image_base64: await toBase64(imageUri), attributes: pillWords('en', spec) }, DescribeSchema);
    return out.description;
  }

  async weeklySummary(input: WeeklySummaryInput): Promise<string> {
    const out = await this.post('/gemma/weekly-summary', { language: input.lang, name: input.elderName, facts: input.facts }, SummarySchema);
    return out.sentences.join(' ');
  }
}

const fix = (d: z.infer<typeof DecisionOut>): Decision => toDecision(d.probs);
