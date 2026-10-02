import type { PillSpec } from '../types';
import { PILL_COLORS } from '../types';
import { findHomography, apply } from './homography';
import { createImage, hexToRgb, type RGBAImage } from './image';
import { MAT } from './mat';
import { insideShape } from './shapes';
import { AR } from './vendor/aruco';

// Synthetic "phone photos" of a pill on the printed mat, for tests, the eval runner and
// the web preview. Deterministic for a given seed.

export type SynthOptions = {
  width?: number;
  height?: number;
  /** degrees the mat is turned in the photo */
  rotateDeg?: number;
  /** 0 = straight from above, 0.15 = clearly tilted */
  tilt?: number;
  /** fraction of the image width the mat fills */
  matFill?: number;
  /** colour cast of the light, multiplies R, G, B (e.g. warm bulb [1.1, 1, 0.8]) */
  light?: [number, number, number];
  /** pill rotation on the mat, degrees */
  pillAngleDeg?: number;
  /** pill offset from the disc centre, mm */
  pillOffsetMm?: { x: number; y: number };
  noise?: number;
  seed?: number;
  /** hide some markers (e.g. a finger over one) */
  hideMarkers?: number[];
};

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const markerBits = (() => {
  const dict = new AR.Dictionary(MAT.dictionary);
  const cache = new Map<number, string>();
  return (id: number) => {
    if (!cache.has(id)) cache.set(id, dict.codeList[id]!);
    return cache.get(id)!;
  };
})();

const rgb = (c: string): [number, number, number] => hexToRgb((PILL_COLORS as Record<string, string>)[c] ?? c);
const PAPER: [number, number, number] = [246, 245, 240];
const TABLE: [number, number, number] = [150, 112, 80];

/** Colour of the printed mat (with the pill on it) at mat position (x, y) mm. */
function matColour(x: number, y: number, pill: PillSpec | null, o: Required<Pick<SynthOptions, 'pillAngleDeg' | 'pillOffsetMm' | 'hideMarkers'>>): [number, number, number] {
  // pill first (it lies on top)
  if (pill?.sizeMm) {
    const { length, width } = pill.sizeMm;
    const a = (o.pillAngleDeg * Math.PI) / 180;
    const dx = x - (MAT.disc.cx + o.pillOffsetMm.x);
    const dy = y - (MAT.disc.cy + o.pillOffsetMm.y);
    const u = (dx * Math.cos(a) + dy * Math.sin(a)) / length;
    const v = (-dx * Math.sin(a) + dy * Math.cos(a)) / width;
    if (insideShape(pill.shape, u, v, length, width)) {
      const split = pill.split ?? 'none';
      const useB = (split === 'vertical' && u > 0) || (split === 'horizontal' && v > 0);
      let c = rgb(useB && pill.colorB ? pill.colorB : pill.colorA);
      // gentle dome shading: lighter in the middle
      const shade = 1.04 - 0.12 * (u * u + v * v) * 4;
      c = c.map((k) => k * shade) as [number, number, number];
      if (pill.score) {
        const across = pill.shape === 'round' || pill.shape === 'diamond' || pill.shape === 'triangle' ? u : u;
        if (Math.abs(across * length) < 0.35) c = c.map((k) => k * 0.72) as [number, number, number];
      }
      return c;
    }
  }
  // markers
  for (const m of MAT.markers) {
    if (o.hideMarkers.includes(m.id)) continue;
    if (x >= m.x && x < m.x + MAT.markerSize && y >= m.y && y < m.y + MAT.markerSize) {
      const cell = MAT.markerSize / 8;
      const cx = Math.floor((x - m.x) / cell);
      const cy = Math.floor((y - m.y) / cell);
      if (cx === 0 || cy === 0 || cx === 7 || cy === 7) return [20, 20, 22];
      return markerBits(m.id)[(cy - 1) * 6 + (cx - 1)] === '1' ? PAPER : [20, 20, 22];
    }
  }
  const d = MAT.disc;
  if (Math.hypot(x - d.cx, y - d.cy) <= d.r) return hexToRgb(d.color);
  for (const p of [MAT.grey, MAT.black, ...MAT.swatches]) {
    if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return hexToRgb(p.color);
  }
  const ring = Math.hypot(x - MAT.ring.cx, y - MAT.ring.cy);
  if (Math.abs(ring - (MAT.ring.r - MAT.ring.stroke / 2)) < MAT.ring.stroke / 2) return [34, 40, 58];
  return PAPER;
}

/** A phone photo of `pill` lying on the mat (pill = null: empty mat). */
export function synthPhoto(pill: PillSpec | null, opts: SynthOptions = {}): RGBAImage {
  const W = opts.width ?? 800;
  const H = opts.height ?? 600;
  const rand = rng(opts.seed ?? 1);
  const o = {
    pillAngleDeg: opts.pillAngleDeg ?? 0,
    pillOffsetMm: opts.pillOffsetMm ?? { x: 0, y: 0 },
    hideMarkers: opts.hideMarkers ?? [],
  };
  const fill = opts.matFill ?? 0.8;
  const rot = ((opts.rotateDeg ?? 0) * Math.PI) / 180;
  const tilt = opts.tilt ?? 0;
  const light = opts.light ?? [1, 1, 1];
  const noise = opts.noise ?? 4;

  // where the 4 mat corners land in the photo
  const mw = W * fill;
  const mh = (mw * MAT.height) / MAT.width;
  const corners = [
    { x: -mw / 2, y: -mh / 2 },
    { x: mw / 2, y: -mh / 2 },
    { x: mw / 2, y: mh / 2 },
    { x: -mw / 2, y: mh / 2 },
  ].map((p, i) => {
    // keystone: the far (top) edge is narrower
    const k = i < 2 ? 1 - tilt : 1 + tilt * 0.5;
    const px = p.x * k;
    return { x: W / 2 + px * Math.cos(rot) - p.y * Math.sin(rot), y: H / 2 + px * Math.sin(rot) + p.y * Math.cos(rot) };
  });
  const matCorners = [
    { x: 0, y: 0 },
    { x: MAT.width, y: 0 },
    { x: MAT.width, y: MAT.height },
    { x: 0, y: MAT.height },
  ];
  const toMat = findHomography(corners, matCorners);

  const img = createImage(W, H);
  const ss = [0.25, 0.75]; // 2x2 supersampling for smooth edges
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const acc = [0, 0, 0];
      for (const sy of ss) {
        for (const sx of ss) {
          const p = apply(toMat, { x: x + sx, y: y + sy });
          const c = p.x < 0 || p.y < 0 || p.x > MAT.width || p.y > MAT.height ? TABLE : matColour(p.x, p.y, pill, o);
          acc[0]! += c[0];
          acc[1]! += c[1];
          acc[2]! += c[2];
        }
      }
      const vign = 1 - 0.12 * (((x - W / 2) / W) ** 2 + ((y - H / 2) / H) ** 2) * 4;
      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        img.data[i + c] = (acc[c]! / 4) * light[c]! * vign + (rand() - 0.5) * 2 * noise;
      }
    }
  }
  return img;
}
