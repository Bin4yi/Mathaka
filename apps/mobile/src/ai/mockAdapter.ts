import {
  checkOptions,
  PrescriptionDraftSchema,
  toDecision,
  type AiAdapter,
  type Decision,
  type DecisionEngine,
  type ImprintResult,
  type PillSpec,
  type PrescriptionDraft,
  type WeeklySummaryInput,
} from '@mathaka/core';

// Mock AI for the web preview and tests. Native AI modules (llama.rn, onnxruntime)
// do not run on web. Outputs are fixed and clearly fake; never used on a real elder phone.

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tiny keyword matcher so the UI flow can be tried on web. Not the real decision model. */
const KEYWORDS: Record<string, string[]> = {
  did_i_take: ['did i take', 'took', 'බිව්වද', 'බිව්වා', 'biwwada', 'biwwa', 'gaththada', 'எடுத்தேனா'],
  when_next: ['when', 'next', 'කවදද', 'කීයටද', 'kiyatada', 'ilaga', 'எப்போது'],
  which_pills: ['which', 'what pills', 'මොනවද', 'monawada', 'எந்த'],
  yes: ['yes', 'ow', 'ඔව්', 'ஆம்', 'biwwa'],
  no: ['no', 'naha', 'නැහැ', 'නෑ', 'இல்லை'],
};

class MockDecisionEngine implements DecisionEngine {
  readonly name = 'mock-keywords';

  async choose(_state: string, question: string, options: string[]): Promise<Decision> {
    checkOptions(options);
    const q = question.toLowerCase();
    const probs: Record<string, number> = {};
    for (const o of options) {
      const hit = (KEYWORDS[o] ?? []).some((k) => q.includes(k));
      probs[o] = hit ? 8 : 1;
    }
    return toDecision(probs);
  }

  async yesNo(state: string, question: string): Promise<Decision> {
    return this.choose(state, question, ['yes', 'no', 'unsure']);
  }
}

export class MockAiAdapter implements AiAdapter {
  readonly kind = 'mock' as const;
  readonly decisions = new MockDecisionEngine();

  async extractPrescription(_imageUri: string): Promise<PrescriptionDraft> {
    await delay(400);
    return PrescriptionDraftSchema.parse({
      rows: [
        { name: 'Metformin', strength: '500 mg', form: 'tablet', dose_count: 1, frequency_raw: '1 bd pc', times: ['morning', 'night'], meal: 'after', confidence: 0.82 },
        { name: 'Amlodipine', strength: '5 mg', form: 'tablet', dose_count: 1, frequency_raw: 'mane', times: ['morning'], meal: 'any', confidence: 0.74 },
        { name: 'Atorvastatin', strength: '10 mg', form: 'tablet', dose_count: 1, frequency_raw: 'nocte', times: ['night'], meal: 'any', confidence: 0.69 },
      ],
    });
  }

  async readImprint(_cropUri: string): Promise<ImprintResult> {
    await delay(200);
    return { text: '', confidence: 0 };
  }

  async describePill(_imageUri: string, spec: PillSpec): Promise<string> {
    const two = spec.colorB && spec.colorB !== spec.colorA ? ` and ${spec.colorB}` : '';
    const imprint = spec.imprint ? ` with ${spec.imprint}` : '';
    return `${spec.colorA}${two} ${spec.shape} ${spec.shape === 'capsule' ? 'capsule' : 'tablet'}${imprint}`;
  }

  async weeklySummary(input: WeeklySummaryInput): Promise<string> {
    return `[mock] ${input.facts.slice(0, 5).join(' ')}`;
  }
}
