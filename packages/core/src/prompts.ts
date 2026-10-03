import { z } from 'zod';
import PROMPTS from '../prompts.json';
import { ImprintSchema, PrescriptionDraftSchema, toDecision, type Decision } from './ai';

// Prompts + output checks shared by every Gemma runner (on-device llama.rn, laptop helper).

export type PromptKey = 'extract_prescription' | 'pill_imprint' | 'describe_pill' | 'weekly_summary' | 'decide';
export type Prompt = { system: string; user: string; schema: object; max_tokens: number };

export function prompt(key: PromptKey, vars: Record<string, string> = {}): Prompt {
  const p = PROMPTS[key];
  return { ...p, user: p.user.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m) };
}

/** Same schema for decide, but with the options as an enum so the model can only pick one. */
export function decideSchema(options: string[]): object {
  return {
    type: 'object',
    properties: { label: { type: 'string', enum: options }, confidence: { type: 'number' } },
    required: ['label', 'confidence'],
  };
}

export const DescribeSchema = z.object({ description: z.string().max(200) });
export const SummarySchema = z.object({ sentences: z.array(z.string()).min(1).max(8) });
export const DecideOutSchema = z.object({ label: z.string(), confidence: z.number().min(0).max(1) });

export const OUTPUT = {
  extract_prescription: PrescriptionDraftSchema,
  pill_imprint: ImprintSchema,
  describe_pill: DescribeSchema,
  weekly_summary: SummarySchema,
  decide: DecideOutSchema,
} as const;

/** Pull the first JSON object out of model text (models sometimes add ``` fences). */
export function parseJsonLoose(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no JSON object in model output');
  return JSON.parse(text.slice(start, end + 1));
}

export class AiFormatError extends Error {
  constructor(public readonly raw: string) {
    super('AI output was not valid JSON for this task');
  }
}

/**
 * Run a JSON task with ONE retry on bad output, then fail clearly.
 * `generate` is the runner (llama.rn on the phone, or Ollama on the laptop).
 */
export async function runJsonTask<K extends PromptKey>(
  key: K,
  p: Prompt,
  generate: (p: Prompt) => Promise<string>,
): Promise<z.infer<(typeof OUTPUT)[K]>> {
  let last = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    last = await generate(p);
    try {
      const parsed = OUTPUT[key].safeParse(parseJsonLoose(last));
      if (parsed.success) return parsed.data as z.infer<(typeof OUTPUT)[K]>;
    } catch {
      // retry once
    }
  }
  throw new AiFormatError(last);
}

/** A model's {label, confidence} -> Decision with probabilities over all options. */
export function decisionFromLabel(out: { label: string; confidence: number }, options: string[]): Decision {
  if (!options.includes(out.label)) throw new AiFormatError(JSON.stringify(out));
  const rest = (1 - out.confidence) / Math.max(1, options.length - 1);
  return toDecision(Object.fromEntries(options.map((o) => [o, o === out.label ? out.confidence : rest])));
}

// ---------- decision layer wording (Laya on the phone, Laya/Gemma in the eval) ----------

export type DecisionTask = 'intent' | 'yesno';
export const INTENT_OPTIONS = ['did_i_take', 'when_next', 'which_pills', 'other'] as const;
export const YESNO_OPTIONS = ['yes', 'no', 'unsure'] as const;

export function decisionWording(task: DecisionTask, text: string): { state: string; question: string; options: Record<string, string> } {
  const d = PROMPTS.decisions[task];
  return { state: d.state.replace('{text}', text.replace(/"/g, "'")), question: d.question, options: d.options };
}

/** Plain descriptions of every decision label (helps the decision model; labels stay short ids). */
export const DECISION_HINTS: Record<string, string> = { ...PROMPTS.decisions.intent.options, ...PROMPTS.decisions.yesno.options };
