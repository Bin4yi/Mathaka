import { z } from 'zod';
import type { PillSpec } from './types';

// JSON contracts shared by every AI implementation (on-device, laptop helper, mock)
// and by the eval scripts. The laptop helper (Python) mirrors these shapes.

export const SlotNameSchema = z.enum(['morning', 'noon', 'evening', 'night']);

export const PrescriptionRowSchema = z.object({
  name: z.string(),
  strength: z.string().default(''),
  form: z.string().default(''),
  dose_count: z.number().positive().max(10).default(1),
  frequency_raw: z.string().default(''),
  times: z.array(SlotNameSchema).default([]),
  meal: z.enum(['before', 'after', 'any']).default('any'),
  notes: z.string().default(''),
  confidence: z.number().min(0).max(1),
});
export type PrescriptionRow = z.infer<typeof PrescriptionRowSchema>;

export const PrescriptionDraftSchema = z.object({ rows: z.array(PrescriptionRowSchema) });
export type PrescriptionDraft = z.infer<typeof PrescriptionDraftSchema>;

export const ImprintSchema = z.object({ text: z.string(), confidence: z.number().min(0).max(1) });
export type ImprintResult = z.infer<typeof ImprintSchema>;

/** Result of one decision. The decision layer only picks a label; it never writes text. */
export type Decision = {
  label: string;
  probs: Record<string, number>;
  confidence: number;
};

export interface DecisionEngine {
  readonly name: string;
  choose(state: string, question: string, options: string[]): Promise<Decision>;
  yesNo(state: string, question: string): Promise<Decision>;
}

export const MAX_OPTIONS = 20;

export type WeeklySummaryInput = {
  lang: 'si' | 'ta' | 'en';
  elderName: string;
  /** plain facts from the log only */
  facts: string[];
};

/** Every screen talks to AI only through this interface. */
export interface AiAdapter {
  readonly kind: 'mock' | 'on-device' | 'laptop-helper';
  extractPrescription(imageUri: string): Promise<PrescriptionDraft>;
  readImprint(cropUri: string): Promise<ImprintResult>;
  describePill(imageUri: string, spec: PillSpec): Promise<string>;
  weeklySummary(input: WeeklySummaryInput): Promise<string>;
  readonly decisions: DecisionEngine;
}

/** Turn raw scores into a Decision (softmax-free: inputs are already probabilities). */
export function toDecision(probs: Record<string, number>): Decision {
  const entries = Object.entries(probs);
  if (entries.length === 0) throw new Error('no options');
  const total = entries.reduce((s, [, p]) => s + p, 0) || 1;
  const norm: Record<string, number> = {};
  for (const [k, p] of entries) norm[k] = p / total;
  const [label, confidence] = Object.entries(norm).sort((a, b) => b[1] - a[1])[0]!;
  return { label, probs: norm, confidence };
}

export function checkOptions(options: string[]): void {
  if (options.length < 2) throw new Error('need at least 2 options');
  if (options.length >= MAX_OPTIONS) throw new Error(`keep option lists under ${MAX_OPTIONS}`);
}
