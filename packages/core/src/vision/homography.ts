// Planar homography (mat mm <-> image px) by least squares DLT. No dependencies.

export type Pt = { x: number; y: number };
/** Row-major 3x3, h[8] fixed to 1. */
export type H = number[];

/** Solve A x = b (n x n) with Gaussian elimination + partial pivoting. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    [M[c], M[p]] = [M[p]!, M[c]!];
    const piv = M[c]![c]!;
    if (Math.abs(piv) < 1e-12) throw new Error('singular system');
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = M[r]![c]! / piv;
      for (let j = c; j <= n; j++) M[r]![j]! -= k * M[c]![j]!;
    }
  }
  return M.map((row, i) => row[n]! / row[i]!);
}

/** Homography mapping src[i] -> dst[i]. Needs >= 4 points, uses all (least squares). */
export function findHomography(src: Pt[], dst: Pt[]): H {
  if (src.length < 4 || src.length !== dst.length) throw new Error('need >= 4 point pairs');
  // normal equations AtA h = Atb for 8 unknowns
  const AtA = Array.from({ length: 8 }, () => new Array<number>(8).fill(0));
  const Atb = new Array<number>(8).fill(0);
  const add = (row: number[], rhs: number) => {
    for (let i = 0; i < 8; i++) {
      Atb[i]! += row[i]! * rhs;
      for (let j = 0; j < 8; j++) AtA[i]![j]! += row[i]! * row[j]!;
    }
  };
  for (let i = 0; i < src.length; i++) {
    const { x, y } = src[i]!;
    const { x: u, y: v } = dst[i]!;
    add([x, y, 1, 0, 0, 0, -u * x, -u * y], u);
    add([0, 0, 0, x, y, 1, -v * x, -v * y], v);
  }
  return [...solve(AtA, Atb), 1];
}

export function apply(h: H, p: Pt): Pt {
  const w = h[6]! * p.x + h[7]! * p.y + h[8]!;
  return { x: (h[0]! * p.x + h[1]! * p.y + h[2]!) / w, y: (h[3]! * p.x + h[4]! * p.y + h[5]!) / w };
}

/** Mean distance (px) between apply(h, src) and dst: how well the markers agree. */
export function reprojectionError(h: H, src: Pt[], dst: Pt[]): number {
  let s = 0;
  for (let i = 0; i < src.length; i++) {
    const p = apply(h, src[i]!);
    s += Math.hypot(p.x - dst[i]!.x, p.y - dst[i]!.y);
  }
  return s / src.length;
}
