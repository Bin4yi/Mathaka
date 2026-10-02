// Mask geometry: convex hull, minimum-area rectangle, polygon simplification.

import type { Pt } from './homography';

export function convexHull(points: Pt[]): Pt[] {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function perimeter(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    s += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return s;
}

export type MinRect = { length: number; width: number; angle: number; center: Pt };

/** Minimum-area bounding rectangle of a convex polygon (rotating over hull edges). */
export function minAreaRect(hull: Pt[]): MinRect {
  let best: MinRect = { length: 0, width: 0, angle: 0, center: { x: 0, y: 0 } };
  let bestArea = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i]!;
    const b = hull[(i + 1) % hull.length]!;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const c = Math.cos(ang), s = Math.sin(ang);
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const p of hull) {
      const u = p.x * c + p.y * s;
      const v = -p.x * s + p.y * c;
      minU = Math.min(minU, u); maxU = Math.max(maxU, u);
      minV = Math.min(minV, v); maxV = Math.max(maxV, v);
    }
    const du = maxU - minU, dv = maxV - minV;
    if (du * dv < bestArea) {
      bestArea = du * dv;
      const cu = (minU + maxU) / 2, cv = (minV + maxV) / 2;
      const center = { x: cu * c - cv * s, y: cu * s + cv * c };
      // angle = direction of the LONG side
      best = du >= dv
        ? { length: du, width: dv, angle: ang, center }
        : { length: dv, width: du, angle: ang + Math.PI / 2, center };
    }
  }
  return best;
}

/** Douglas–Peucker on a closed polygon. Returns the simplified vertex list. */
export function simplifyClosed(poly: Pt[], epsilon: number): Pt[] {
  if (poly.length < 4) return poly;
  // start from the two points farthest apart so the split is stable
  let ia = 0, ib = 0, far = -1;
  for (let i = 0; i < poly.length; i++) {
    for (let j = i + 1; j < poly.length; j++) {
      const d = Math.hypot(poly[i]!.x - poly[j]!.x, poly[i]!.y - poly[j]!.y);
      if (d > far) { far = d; ia = i; ib = j; }
    }
  }
  const chainA = poly.slice(ia, ib + 1);
  const chainB = [...poly.slice(ib), ...poly.slice(0, ia + 1)];
  const dp = (pts: Pt[]): Pt[] => {
    if (pts.length < 3) return pts;
    const a = pts[0]!, b = pts[pts.length - 1]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let idx = 0, dmax = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i]!;
      const d = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x) / len;
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax <= epsilon) return [a, b];
    return [...dp(pts.slice(0, idx + 1)).slice(0, -1), ...dp(pts.slice(idx))];
  };
  return [...dp(chainA).slice(0, -1), ...dp(chainB).slice(0, -1)];
}
