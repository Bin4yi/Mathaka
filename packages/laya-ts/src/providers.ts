// Vendored from laya-ts (https://github.com/NandhaKishorM/laya/tree/469c167bc76e22b944b7518b51e0815c4189aed8/laya-ts/src/providers.ts)
// Copyright Convai Innovations. Apache License 2.0 (see ../LICENSE). Patched only as described
// in tools/vendor-laya-ts.mjs. Do not edit by hand; re-run the script.
/* eslint-disable */
// @ts-nocheck
export interface Batch {
  inputIds: number[][];
  attentionMask: number[][];
  markerPos: number[][];
  markerMask: boolean[][];
  qtype: number[];
}

export interface SessionProvider {
  runEncoder(batch: Batch): Promise<{ lastHidden: number[][][] }>;
  runHead(hidden: number[][][] | unknown, batch: Batch): Promise<{ logits: number[][]; act: number[][] }>;
}

function toNested(data: ArrayLike<number | bigint | boolean>, dims: number[]): any {
  // Single-pass copy + precomputed steps; no per-node slice/reduce.
  let total = 1;
  for (const d of dims) total *= d;
  const flat = new Array(total);
  for (let i = 0; i < total; i++) {
    const v = (data as any)[i];
    flat[i] = typeof v === "bigint" ? Number(v) : v;
  }
  if (dims.length === 0) return flat[0];
  const steps: number[] = new Array(dims.length);
  for (let d = 0; d < dims.length; d++) {
    let s = 1;
    for (let k = d + 1; k < dims.length; k++) s *= dims[k];
    steps[d] = s;
  }
  const rec = (d: number, off: number): any => {
    if (d === dims.length - 1) return flat.slice(off, off + dims[d]);
    const out: any[] = new Array(dims[d]);
    for (let i = 0; i < dims[d]; i++) out[i] = rec(d + 1, off + i * steps[d]);
    return out;
  };
  return rec(0, 0);
}

function i64(ort: any, arr: number[] | number[][], dims: number[]): any {
  // Rank <= 2 by construction; direct loop avoids flat(Infinity) intermediates.
  const out = new BigInt64Array(dims.reduce((a, b) => a * b, 1));
  let p = 0;
  if (Array.isArray((arr as any)[0])) {
    for (const row of arr as number[][]) for (const v of row) out[p++] = BigInt(Math.trunc(v));
  } else {
    for (const v of arr as number[]) out[p++] = BigInt(Math.trunc(v));
  }
  return new ort.Tensor("int64", out, dims);
}

export function feed(ort: any, b: Batch): Record<string, any> {
  const n = b.inputIds.length;
  let L = 1;
  for (const r of b.inputIds) if (r.length > L) L = r.length;
  return {
    input_ids: i64(ort, b.inputIds, [n, L]),
    attention_mask: i64(ort, b.attentionMask, [n, L]),
  };
}

export function feedHead(ort: any, hidden: number[][][] | any, b: Batch): Record<string, any> {
  const n = b.markerPos.length;
  let k = 1;
  for (const r of b.markerPos) if (r.length > k) k = r.length;
  // Direct flatten into typed arrays; no flat(Infinity)+map intermediates.
  const nH = (hidden as any).length ?? n;
  const S = (hidden as any)[0]?.length ?? 1;
  const Hd = (hidden as any)[0]?.[0]?.length ?? 1;
  const flatH = new Float32Array(nH * S * Hd);
  let p = 0;
  for (let i = 0; i < nH; i++) {
    const bi = (hidden as any)[i] ?? [];
    for (let j = 0; j < S; j++) {
      const hj = bi[j] ?? [];
      for (let h = 0; h < Hd; h++) flatH[p++] = Number(hj[h] ?? 0);
    }
  }
  const H = new ort.Tensor("float32", flatH, [nH, S, Hd]);
  // Pad/trim mask rows to S so the mask always matches hidden_states even
  // if a caller passes unpadded rows.
  const maskRows = b.attentionMask.map((r) => {
    const row = r.slice(0, S);
    while (row.length < S) row.push(0);
    return row;
  });
  return {
    hidden_states: H,
    marker_pos: i64(ort, b.markerPos, [n, k]),
    marker_mask: new ort.Tensor("bool", (() => {
      const out = new Uint8Array(n * k);
      let q = 0;
      for (const row of b.markerMask as unknown as boolean[][])
        for (let j = 0; j < k; j++) out[q++] = row[j] ? 1 : 0;
      return out;
    })(), [n, k]),
    qtype: i64(ort, b.qtype.map((v) => [v]), [n, 1]),
    // Padding mask for the head transformer (py DecisionModel.forward).
    // Without it, batch mates of unequal length corrupt each other's markers.
    attention_mask: i64(ort, maskRows, [n, S]),
  };
}
