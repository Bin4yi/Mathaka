import type { PillColorName, PillShape, PillSpec } from '../types';
import { classifyShape, nearestColor } from './features';
import { convexHull, minAreaRect, perimeter, simplifyClosed } from './geometry';
import { apply, findHomography, reprojectionError, type H, type Pt } from './homography';
import { createImage, deltaE, downscale, rgbToLab, sample, type Lab, type RGBAImage } from './image';
import { MAT, markerCornersMm } from './mat';
import { AR } from './vendor/aruco';

/** Warped mat resolution (pixels per mm). */
export const PX_PER_MM = 4;
const DETECT_MAX_SIDE = 800;

export type PillWarning =
  | 'no_markers' // size unknown; shape and colour are best effort
  | 'few_markers'
  | 'no_pill'
  | 'pill_touches_edge'
  | 'low_contrast'
  | 'too_dark';

export type PillFeatures = {
  shape: PillShape;
  colorA: PillColorName;
  colorB?: PillColorName;
  split: 'none' | 'vertical' | 'horizontal';
  score: boolean;
  labA: Lab;
  labB?: Lab;
  sizeMm?: { length: number; width: number };
  areaMm2?: number;
  measures: { aspect: number; circularity: number; extent: number; vertices: number };
  markersFound: number;
  confidence: number;
  warnings: PillWarning[];
};

export type PillAnalysis = {
  features: PillFeatures | null;
  warnings: PillWarning[];
  /** Mat seen from above (PX_PER_MM px per mm), or the downscaled photo when markers are missing. */
  view: RGBAImage;
  /** Pill box in `view` pixels, for the imprint crop sent to Gemma (M5). */
  crop?: { x: number; y: number; w: number; h: number };
  timingsMs: Record<string, number>;
};

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// ---------------------------------------------------------------------------

/** Find the mat markers. Returns image-px <-> mat-mm correspondences (4 corners per marker). */
export function detectMat(img: RGBAImage): { h: H | null; markers: number; error: number } {
  const small = downscale(img, DETECT_MAX_SIDE);
  const k = img.width / small.width;
  const detector = new AR.Detector({ dictionaryName: MAT.dictionary });
  const found = detector.detect(small).filter((m) => MAT.markers.some((x) => x.id === m.id));
  // keep one detection per id (the one with the lowest hamming distance)
  const byId = new Map<number, (typeof found)[number]>();
  for (const m of found) {
    const old = byId.get(m.id);
    if (!old || m.hammingDistance < old.hammingDistance) byId.set(m.id, m);
  }
  const src: Pt[] = [];
  const dst: Pt[] = [];
  for (const m of byId.values()) {
    const mm = markerCornersMm(m.id);
    m.corners.forEach((c, i) => {
      src.push(mm[i]!);
      dst.push({ x: c.x * k, y: c.y * k });
    });
  }
  if (byId.size < 2) return { h: null, markers: byId.size, error: Infinity };
  const h = findHomography(src, dst);
  return { h, markers: byId.size, error: reprojectionError(h, src, dst) };
}

type Box = { x: number; y: number; w: number; h: number };
/** Parts of the mat the pipeline reads (mm). Everything else stays black: saves time on phones. */
const USED: Box[] = [
  { x: MAT.disc.cx - MAT.disc.r, y: MAT.disc.cy - MAT.disc.r, w: 2 * MAT.disc.r, h: 2 * MAT.disc.r },
  { x: MAT.grey.x, y: MAT.grey.y, w: MAT.grey.w, h: MAT.grey.h },
];

/** Render the mat from above: output pixel (x, y) = mat mm (x / S, y / S). */
export function warpMat(img: RGBAImage, h: H, s = PX_PER_MM, regions: Box[] | 'all' = USED): RGBAImage {
  const w = Math.round(MAT.width * s);
  const ht = Math.round(MAT.height * s);
  const out = createImage(w, ht);
  const boxes = regions === 'all' ? [{ x: 0, y: 0, w: MAT.width, h: MAT.height }] : regions;
  for (const box of boxes) {
    const yEnd = Math.min(ht, Math.ceil((box.y + box.h) * s));
    const xEnd = Math.min(w, Math.ceil((box.x + box.w) * s));
    for (let y = Math.max(0, Math.floor(box.y * s)); y < yEnd; y++) {
      for (let x = Math.max(0, Math.floor(box.x * s)); x < xEnd; x++) {
        const p = apply(h, { x: (x + 0.5) / s, y: (y + 0.5) / s });
        const [r, g, b] = sample(img, p.x, p.y);
        const o = (y * w + x) * 4;
        out.data[o] = r;
        out.data[o + 1] = g;
        out.data[o + 2] = b;
      }
    }
  }
  return out;
}

/** Per-channel gain so the printed 50% grey patch reads as RGB 128 (white balance + exposure). */
function greyGains(view: RGBAImage, s: number): { gains: [number, number, number]; tooDark: boolean } {
  const g = MAT.grey;
  const sum = [0, 0, 0];
  let n = 0;
  const pad = 0.2;
  for (let y = Math.round((g.y + g.h * pad) * s); y < Math.round((g.y + g.h * (1 - pad)) * s); y++) {
    for (let x = Math.round((g.x + g.w * pad) * s); x < Math.round((g.x + g.w * (1 - pad)) * s); x++) {
      const i = (y * view.width + x) * 4;
      sum[0]! += view.data[i]!;
      sum[1]! += view.data[i + 1]!;
      sum[2]! += view.data[i + 2]!;
      n++;
    }
  }
  const mean = sum.map((v) => v / Math.max(1, n));
  const tooDark = Math.max(...mean) < 25;
  const gains = mean.map((m) => Math.min(4, 128 / Math.max(m, 1))) as [number, number, number];
  return { gains, tooDark };
}

/** Otsu threshold on values in [0, maxV]. */
function otsu(values: Float32Array, maxV: number): number {
  const bins = 128;
  const hist = new Array<number>(bins).fill(0);
  for (const v of values) hist[Math.min(bins - 1, Math.floor((v / maxV) * bins))]!++;
  const total = values.length;
  let sumAll = 0;
  for (let i = 0; i < bins; i++) sumAll += i * hist[i]!;
  let sumB = 0, wB = 0, best = 0, bestVar = -1;
  for (let i = 0; i < bins; i++) {
    wB += hist[i]!;
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i]!;
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const v = wB * wF * (mB - mF) ** 2;
    if (v > bestVar) {
      bestVar = v;
      best = i;
    }
  }
  return ((best + 0.5) / bins) * maxV;
}

/** Keep the largest 4-connected component and fill its holes. */
function largestComponent(mask: Uint8Array, w: number, h: number): Uint8Array {
  const label = new Int32Array(w * h);
  let bestLabel = 0, bestSize = 0, next = 0;
  const stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || label[i]) continue;
    next++;
    let size = 0;
    stack.push(i);
    label[i] = next;
    while (stack.length) {
      const p = stack.pop()!;
      size++;
      const x = p % w, y = (p - x) / w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && mask[q] && !label[q]) {
          label[q] = next;
          stack.push(q);
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = next;
    }
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = label[i] === bestLabel && bestLabel > 0 ? 1 : 0;
  // fill holes: flood the outside from the border; whatever is not reached and not set is a hole
  const outside = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) if (!out[y * w + x]) stack.push(y * w + x);
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) if (!out[y * w + x]) stack.push(y * w + x);
  while (stack.length) {
    const p = stack.pop()!;
    if (outside[p] || out[p]) continue;
    outside[p] = 1;
    const x = p % w, y = (p - x) / w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  for (let i = 0; i < w * h; i++) if (!outside[i]) out[i] = 1;
  return out;
}

function erode(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  let cur = mask;
  for (let k = 0; k < r; k++) {
    const nxt = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        nxt[i] = cur[i] && cur[i - 1] && cur[i + 1] && cur[i - w] && cur[i + w] ? 1 : 0;
      }
    }
    cur = nxt;
  }
  return cur;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

/** 2-means on Lab pixels. Returns centres and the label of each pixel. */
function twoMeans(px: Lab[]): { c: [Lab, Lab]; label: Uint8Array } {
  // start from the lightest and darkest-by-chroma-distance points: stable and deterministic
  let a = px[0]!, b = px[0]!;
  let far = -1;
  const mid = px[Math.floor(px.length / 2)]!;
  for (const p of px) {
    const d = deltaE(p, mid);
    if (d > far) {
      far = d;
      a = p;
    }
  }
  far = -1;
  for (const p of px) {
    const d = deltaE(p, a);
    if (d > far) {
      far = d;
      b = p;
    }
  }
  let c: [Lab, Lab] = [a, b];
  const label = new Uint8Array(px.length);
  for (let it = 0; it < 12; it++) {
    const sum = [[0, 0, 0], [0, 0, 0]];
    const n = [0, 0];
    px.forEach((p, i) => {
      const k = deltaE(p, c[0]) <= deltaE(p, c[1]) ? 0 : 1;
      label[i] = k;
      n[k]!++;
      for (let j = 0; j < 3; j++) sum[k]![j]! += p[j]!;
    });
    c = [0, 1].map((k) => (n[k] ? (sum[k]!.map((v) => v / n[k]!) as Lab) : c[k]!)) as [Lab, Lab];
  }
  return { c, label };
}

// ---------------------------------------------------------------------------

/**
 * Measure one pill on the mat. Never throws for a bad photo: returns warnings instead,
 * so the Memory Buddy can retake it.
 */
export function analyzePillPhoto(photo: RGBAImage): PillAnalysis {
  const t: Record<string, number> = {};
  let t0 = now();
  const warnings: PillWarning[] = [];

  const mat = detectMat(photo);
  t.markers = now() - t0;
  t0 = now();

  if (!mat.h) {
    warnings.push('no_markers');
    return { features: null, warnings, view: downscale(photo, 512), timingsMs: t };
  }
  if (mat.markers < 4) warnings.push('few_markers');

  const s = PX_PER_MM;
  const view = warpMat(photo, mat.h, s);
  t.warp = now() - t0;
  t0 = now();

  const { gains, tooDark } = greyGains(view, s);
  if (tooDark) warnings.push('too_dark');

  const W = view.width, Ht = view.height;
  const { cx, cy, r } = MAT.disc;
  const labAt = (x: number, y: number): Lab => {
    const i = (y * W + x) * 4;
    return rgbToLab(
      Math.min(255, view.data[i]! * gains[0]),
      Math.min(255, view.data[i + 1]! * gains[1]),
      Math.min(255, view.data[i + 2]! * gains[2]),
    );
  };

  // background colour: ring just inside the disc edge
  const ringL: number[] = [], ringA: number[] = [], ringB: number[] = [];
  const inner = (r - 1.2) * s;
  const x0 = Math.floor((cx - r) * s), x1 = Math.ceil((cx + r) * s);
  const y0 = Math.floor((cy - r) * s), y1 = Math.ceil((cy + r) * s);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const d = Math.hypot(x + 0.5 - cx * s, y + 0.5 - cy * s);
      if (d > inner - 2.5 * s && d <= inner) {
        const lab = labAt(x, y);
        ringL.push(lab[0]); ringA.push(lab[1]); ringB.push(lab[2]);
      }
    }
  }
  const bg: Lab = [median(ringL), median(ringA), median(ringB)];

  // distance to background for every pixel in the disc
  const bw = x1 - x0, bh = y1 - y0;
  const dist = new Float32Array(bw * bh);
  const inDisc = new Uint8Array(bw * bh);
  const labs: Lab[] = new Array(bw * bh);
  const discVals: number[] = [];
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const gx = x + x0, gy = y + y0;
      if (Math.hypot(gx + 0.5 - cx * s, gy + 0.5 - cy * s) > inner) continue;
      const lab = labAt(gx, gy);
      const i = y * bw + x;
      labs[i] = lab;
      inDisc[i] = 1;
      dist[i] = deltaE(lab, bg);
      discVals.push(dist[i]!);
    }
  }
  const thr = Math.max(12, otsu(Float32Array.from(discVals), 120));
  const raw = new Uint8Array(bw * bh);
  for (let i = 0; i < raw.length; i++) raw[i] = inDisc[i] && dist[i]! > thr ? 1 : 0;
  const mask = largestComponent(erode(raw, bw, bh, 0), bw, bh);
  t.segment = now() - t0;
  t0 = now();

  // measurements (in mm)
  const pts: Pt[] = [];
  let area = 0, touches = false;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      if (!mask[y * bw + x]) continue;
      area++;
      pts.push({ x: x + 0.5, y: y + 0.5 });
      const gx = x + x0, gy = y + y0;
      if (Math.hypot(gx + 0.5 - cx * s, gy + 0.5 - cy * s) > inner - 1.5) touches = true;
    }
  }
  const areaMm2 = area / (s * s);
  if (areaMm2 < 12) {
    warnings.push('no_pill');
    return { features: null, warnings, view, timingsMs: t };
  }
  if (touches) warnings.push('pill_touches_edge');

  // hull of pixel corners (half a pixel out) so sizes are not one pixel short
  const corners: Pt[] = [];
  for (const p of pts) {
    if (!isBoundary(mask, bw, bh, p)) continue;
    corners.push({ x: p.x - 0.5, y: p.y - 0.5 }, { x: p.x + 0.5, y: p.y - 0.5 }, { x: p.x - 0.5, y: p.y + 0.5 }, { x: p.x + 0.5, y: p.y + 0.5 });
  }
  // The true edge lies between the hull of pixel centres (too small) and the hull of
  // pixel corners (too big): use the average of the two for every measure.
  const hull = convexHull(corners);
  const hullC = convexHull(pts.filter((p) => isBoundary(mask, bw, bh, p)));
  const rectOut = minAreaRect(hull);
  const rectIn = minAreaRect(hullC);
  const rect = { ...rectOut, length: (rectOut.length + rectIn.length) / 2, width: (rectOut.width + rectIn.width) / 2 };
  let lengthMm = rect.length / s;
  let widthMm = rect.width / s;
  const per = (perimeter(hull) + perimeter(hullC)) / 2;
  const measures = {
    aspect: lengthMm / Math.max(widthMm, 0.1),
    circularity: (4 * Math.PI * area) / (per * per),
    extent: area / Math.max(1, rect.length * rect.width),
    vertices: simplifyClosed(hull, 0.12 * rect.width).length,
  };

  // colours: inner pixels only (edges mix with the background)
  const core = erode(mask, bw, bh, Math.max(1, Math.round(0.6 * s)));
  const corePx: Lab[] = [];
  const corePos: Pt[] = [];
  for (let i = 0; i < core.length; i++) {
    if (!core[i]) continue;
    corePx.push(labs[i]!);
    corePos.push({ x: (i % bw) + 0.5, y: Math.floor(i / bw) + 0.5 });
  }
  const pxForColour = corePx.length > 30 ? corePx : pts.map((p) => labs[Math.floor(p.y) * bw + Math.floor(p.x)]!);
  const posForColour = corePx.length > 30 ? corePos : pts;

  const { c, label } = twoMeans(pxForColour);
  const n1 = label.reduce((a, v) => a + v, 0);
  const n0 = label.length - n1;
  const frac = Math.min(n0, n1) / label.length;
  const ca = Math.cos(rect.angle), sa = Math.sin(rect.angle);
  let split: 'none' | 'vertical' | 'horizontal' = 'none';
  let labA: Lab, labB: Lab | undefined;
  if (frac >= 0.2 && deltaE(c[0], c[1]) >= 18) {
    // where do the two colours sit? along the length -> vertical split (left/right halves)
    const mean = [{ u: 0, v: 0 }, { u: 0, v: 0 }];
    posForColour.forEach((p, i) => {
      const k = label[i]!;
      const du = (p.x - rect.center.x) * ca + (p.y - rect.center.y) * sa;
      const dv = -(p.x - rect.center.x) * sa + (p.y - rect.center.y) * ca;
      mean[k]!.u += du;
      mean[k]!.v += dv;
    });
    const sepU = Math.abs(mean[0]!.u / Math.max(1, n0) - mean[1]!.u / Math.max(1, n1)) / rect.length;
    const sepV = Math.abs(mean[0]!.v / Math.max(1, n0) - mean[1]!.v / Math.max(1, n1)) / rect.width;
    if (sepU > 0.25 && sepU >= sepV) split = 'vertical';
    else if (sepV > 0.25) split = 'horizontal';
  }
  if (split !== 'none') {
    // colour A = the half on the "left" (negative u), like the asset script draws it
    const firstLeft = (() => {
      let u0 = 0;
      posForColour.forEach((p, i) => {
        if (label[i] === 0) u0 += split === 'vertical'
          ? (p.x - rect.center.x) * ca + (p.y - rect.center.y) * sa
          : -(p.x - rect.center.x) * sa + (p.y - rect.center.y) * ca;
      });
      return u0 < 0;
    })();
    [labA, labB] = firstLeft ? [c[0], c[1]] : [c[1], c[0]];
  } else {
    // one colour: median of the lighter 90% (ignores imprint and score-line shadows)
    const sorted = [...pxForColour].sort((p, q) => p[0] - q[0]);
    const keep = sorted.slice(Math.floor(sorted.length * 0.1));
    labA = [median(keep.map((p) => p[0])), median(keep.map((p) => p[1])), median(keep.map((p) => p[2]))];
  }

  const twoTone = split !== 'none';
  const shape = classifyShape(measures, twoTone);
  const score = detectScore(labs, core, bw, bh, rect, shape, s);
  if (shape === 'diamond') {
    // a diamond's size is its two diagonals (how PillGraphic draws it), not its sides
    const d = diagonals(hull, hullC);
    lengthMm = d.long / s;
    widthMm = d.short / s;
  }
  if (deltaE(labA, bg) < 20) warnings.push('low_contrast');

  const colorA = nearestColor(labA).name;
  const colorB = labB ? nearestColor(labB).name : undefined;
  let confidence = 1;
  if (mat.markers < 4) confidence -= 0.15;
  if (touches) confidence -= 0.3;
  if (warnings.includes('low_contrast')) confidence -= 0.2;
  if (warnings.includes('too_dark')) confidence -= 0.3;
  if (mat.error > 3) confidence -= 0.2;
  t.features = now() - t0;

  const pad = 1.5 * s;
  const minX = Math.min(...hull.map((p) => p.x)) + x0 - pad;
  const minY = Math.min(...hull.map((p) => p.y)) + y0 - pad;
  const maxX = Math.max(...hull.map((p) => p.x)) + x0 + pad;
  const maxY = Math.max(...hull.map((p) => p.y)) + y0 + pad;

  return {
    features: {
      shape,
      colorA,
      colorB: colorB && colorB !== colorA ? colorB : twoTone ? colorB : undefined,
      split: colorB && colorB !== colorA ? split : twoTone ? split : 'none',
      score,
      labA,
      labB,
      sizeMm: { length: round1(lengthMm), width: round1(widthMm) },
      areaMm2: round1(areaMm2),
      measures,
      markersFound: mat.markers,
      confidence: Math.max(0, Math.round(confidence * 100) / 100),
      warnings,
    },
    warnings,
    view,
    crop: {
      x: Math.max(0, Math.floor(minX)),
      y: Math.max(0, Math.floor(minY)),
      w: Math.min(W, Math.ceil(maxX)) - Math.max(0, Math.floor(minX)),
      h: Math.min(Ht, Math.ceil(maxY)) - Math.max(0, Math.floor(minY)),
    },
    timingsMs: t,
  };
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Longest diagonal (hull diameter) and the extent across it, averaged over both hulls. */
function diagonals(outer: Pt[], inner: Pt[]): { long: number; short: number } {
  const one = (hull: Pt[]) => {
    let best = 0, a = hull[0]!, b = hull[0]!;
    for (const p of hull) for (const q of hull) {
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d > best) { best = d; a = p; b = q; }
    }
    const ux = (b.x - a.x) / (best || 1), uy = (b.y - a.y) / (best || 1);
    let lo = Infinity, hi = -Infinity;
    for (const p of hull) {
      const v = -(p.x - a.x) * uy + (p.y - a.y) * ux;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    return { long: best, short: hi - lo };
  };
  const o = one(outer), i = one(inner);
  return { long: (o.long + i.long) / 2, short: (o.short + i.short) / 2 };
}

function isBoundary(mask: Uint8Array, w: number, h: number, p: Pt): boolean {
  const x = Math.floor(p.x), y = Math.floor(p.y);
  if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return true;
  const i = y * w + x;
  return !mask[i - 1] || !mask[i + 1] || !mask[i - w] || !mask[i + w];
}

/**
 * Score line: a darker line through the centre, across the short side.
 * Uses medians, so a printed number crossing the line does not count as a score.
 */
function detectScore(
  labs: Lab[],
  core: Uint8Array,
  w: number,
  h: number,
  rect: { length: number; width: number; angle: number; center: Pt },
  shape: PillShape,
  s: number,
): boolean {
  const pillL: number[] = [];
  for (let i = 0; i < core.length; i++) if (core[i]) pillL.push(labs[i]![0]);
  if (pillL.length < 50) return false;
  const base = median(pillL);
  // round-ish pills: the line can be at any angle
  const angles = shape === 'round' || shape === 'diamond' || shape === 'triangle'
    ? Array.from({ length: 18 }, (_, k) => (k * Math.PI) / 18)
    : [rect.angle + Math.PI / 2];
  let bestDip = 0;
  for (const ang of angles) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const half = Math.max(rect.length, rect.width) / 2;
    const line: number[] = [];
    for (let tt = -half; tt <= half; tt += 0.5) {
      for (const off of [-0.5, 0, 0.5]) {
        const x = Math.round(rect.center.x + tt * dx - off * dy);
        const y = Math.round(rect.center.y + tt * dy + off * dx);
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const i = y * w + x;
        if (core[i]) line.push(labs[i]![0]);
      }
    }
    if (line.length < 0.5 * s * 3) continue;
    bestDip = Math.max(bestDip, base - median(line));
  }
  return bestDip >= 5;
}

/** Turn measured features into the PillSpec the app stores and draws. */
export function featuresToSpec(f: PillFeatures): PillSpec {
  return {
    shape: f.shape,
    colorA: f.colorA,
    colorB: f.split !== 'none' ? f.colorB : undefined,
    split: f.split,
    score: f.score,
    sizeMm: f.sizeMm,
  };
}
