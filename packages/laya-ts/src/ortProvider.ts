// Mathaka glue (ours): a Laya SessionProvider over ANY onnxruntime flavour with the
// standard API (onnxruntime-node for the eval, onnxruntime-react-native on the phone).
// Same inputs/outputs as laya-ts' own node provider.

import { feed, feedHead, type Batch, type SessionProvider } from './providers';

type Tensor = { data: ArrayLike<number | bigint>; dims: readonly number[] };
export type OrtSession = { run(feeds: Record<string, unknown>): Promise<Record<string, Tensor>> };
export type OrtLike = { Tensor: new (type: string, data: unknown, dims: number[]) => unknown };

function pick(out: Record<string, Tensor>, names: string[]): Tensor {
  for (const n of names) if (out[n] !== undefined) return out[n]!;
  return Object.values(out)[0]!;
}

function nested(t: Tensor): any {
  const dims = [...t.dims];
  const flat = Array.from(t.data as ArrayLike<number>, (v) => Number(v));
  const rec = (d: number, off: number): any => {
    if (d === dims.length - 1) return flat.slice(off, off + dims[d]!);
    const step = dims.slice(d + 1).reduce((a, b) => a * b, 1);
    return Array.from({ length: dims[d]! }, (_, i) => rec(d + 1, off + i * step));
  };
  return dims.length === 0 ? flat[0] : rec(0, 0);
}

export function createOrtProvider(ort: OrtLike, encoder: OrtSession, head: OrtSession): SessionProvider {
  return {
    async runEncoder(b: Batch) {
      const out = await encoder.run(feed(ort, b));
      return { lastHidden: nested(pick(out, ['last_hidden_state', 'lastHidden', 'hidden_states'])) };
    },
    async runHead(h: unknown, b: Batch) {
      const out = await head.run(feedHead(ort, h as number[][][], b));
      const vals = Object.values(out);
      const act = out['act_logits'] ?? out['act'] ?? vals[1] ?? vals[0]!;
      return { logits: nested(pick(out, ['logits'])), act: nested(act) };
    },
  };
}
