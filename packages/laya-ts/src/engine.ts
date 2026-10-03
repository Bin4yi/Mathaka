// Mathaka glue (ours, not vendored): Laya as a DecisionEngine.
// Laya picks one option and gives calibrated probabilities. It cannot write text.

import { checkOptions, DECISION_HINTS, toDecision, type Decision, type DecisionEngine } from '@mathaka/core';
import { Agent, type AgentCfg, type ChoiceAnswer } from './agent';
import type { SessionProvider } from './providers';
import { encodeWithData, parseTokenizerJson } from './tokenizer';

/** Same wording as the eval and the Gemma decide prompt (packages/core/prompts.json). */
export const OPTION_HINTS = DECISION_HINTS;

export function buildAgent(provider: SessionProvider, tokenizerJson: unknown, cfg: AgentCfg): Agent {
  const data = parseTokenizerJson(tokenizerJson);
  if (!data) throw new Error('tokenizer.json not supported');
  const tok = {
    clsId: data.ids.cls,
    sepId: data.ids.sep,
    maskId: data.ids.mask,
    padId: data.ids.pad,
    maskToken: data.maskToken,
    encode: (text: string) => encodeWithData(data, text),
  };
  return new Agent({ provider, tok, cfg });
}

export class LayaDecisionEngine implements DecisionEngine {
  constructor(
    private readonly agent: Agent,
    readonly name = 'laya',
  ) {}

  async choose(state: string, question: string, options: string[]): Promise<Decision> {
    checkOptions(options);
    const criteria = Object.fromEntries(options.map((o) => [o, OPTION_HINTS[o] ?? o]));
    const res = await this.agent.predict(state, { decision: { type: 'choice', instructions: question, criteria } });
    const a = res.answers.decision as ChoiceAnswer;
    return toDecision(Object.fromEntries(options.map((o) => [o, a.probabilities[o] ?? 0])));
  }

  yesNo(state: string, question: string): Promise<Decision> {
    return this.choose(state, question, ['yes', 'no', 'unsure']);
  }
}
