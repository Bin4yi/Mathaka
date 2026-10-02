import type { PillColorName, PillShape, PillSpec } from '../types';
import { PILL_COLORS } from '../types';
import { deltaE, hexToRgb, rgbToLab, type Lab } from './image';

export type ShapeMeasures = {
  aspect: number; // length / width
  circularity: number; // 4πA / P² (hull perimeter): circle 1, square .785, triangle .6
  extent: number; // area / (length · width) of the min-area rect: ellipse .785, rounded rect ~.92
  vertices: number; // corners after simplifying the hull
};

/**
 * Shape from simple measures:
 * - near-square box: round if smooth, else triangle (3 corners) or diamond (4 corners)
 * - long box: ellipse-like (low extent) -> oval; rounded ends -> capsule (or two-tone);
 *             squarer ends (highest extent) -> oblong
 */
export function classifyShape(m: ShapeMeasures, twoTone: boolean): PillShape {
  if (m.aspect < 1.2) {
    if (m.circularity >= 0.86) return 'round';
    // a diamond is a turned square: it fills its own min-area box; a triangle fills half
    if (m.extent >= 0.8) return 'diamond';
    if (m.vertices === 3 || m.extent < 0.65) return 'triangle';
    return m.vertices === 4 ? 'diamond' : 'round';
  }
  // thresholds measured on 25 synthetic photos per shape (oval .77-.83, capsule .85-.91, oblong .89-.95)
  if (m.extent < 0.7) return m.vertices === 3 ? 'triangle' : 'diamond';
  if (m.extent < 0.835) return 'oval';
  if (twoTone) return 'capsule';
  return m.extent < 0.891 ? 'capsule' : 'oblong';
}

const PALETTE_LAB: [PillColorName, Lab][] = (Object.keys(PILL_COLORS) as PillColorName[]).map((name) => {
  const [r, g, b] = hexToRgb(PILL_COLORS[name]);
  return [name, rgbToLab(r, g, b)];
});

export function nearestColor(lab: Lab): { name: PillColorName; distance: number } {
  let best: PillColorName = 'white';
  let bestD = Infinity;
  for (const [name, p] of PALETTE_LAB) {
    const d = deltaE(lab, p);
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return { name: best, distance: bestD };
}

export function paletteLab(color: string): Lab {
  const hex = (PILL_COLORS as Record<string, string>)[color] ?? (color.startsWith('#') ? color : '#888888');
  const [r, g, b] = hexToRgb(hex);
  return rgbToLab(r, g, b);
}

/** Spec + optional measured colours, as stored in a pill profile. */
export type PillLook = PillSpec & { labA?: Lab; labB?: Lab };

const SHAPE_NEAR: Record<string, number> = {
  'oval|round': 0.5,
  'oblong|oval': 0.5,
  'capsule|oblong': 0.4,
  'capsule|oval': 0.6,
  'diamond|triangle': 0.7,
};

/**
 * How different two pills look, 0 (same) .. ~1 (very different).
 * Used for the look-alike check (calibration) and pill matching (elder "Check my pills").
 */
export function pillDistance(a: PillLook, b: PillLook): number {
  const shapeKey = [a.shape, b.shape].sort().join('|');
  const shape = a.shape === b.shape ? 0 : SHAPE_NEAR[shapeKey] ?? 1;

  const la = a.labA ?? paletteLab(a.colorA);
  const lb = b.labA ?? paletteLab(b.colorA);
  let color = Math.min(1, deltaE(la, lb) / 40);
  const twoA = !!a.colorB && a.colorB !== a.colorA && (a.split ?? 'none') !== 'none';
  const twoB = !!b.colorB && b.colorB !== b.colorA && (b.split ?? 'none') !== 'none';
  if (twoA && twoB) {
    const la2 = a.labB ?? paletteLab(a.colorB!);
    const lb2 = b.labB ?? paletteLab(b.colorB!);
    // the two halves can be matched either way round
    const same = (deltaE(la, lb) + deltaE(la2, lb2)) / 2;
    const swap = (deltaE(la, lb2) + deltaE(la2, lb)) / 2;
    color = Math.min(1, Math.min(same, swap) / 40);
  }
  const twoTone = twoA === twoB ? 0 : 1;

  let size = 0;
  let sizeW = 0;
  if (a.sizeMm && b.sizeMm) {
    const dl = Math.abs(a.sizeMm.length - b.sizeMm.length) / Math.max(a.sizeMm.length, b.sizeMm.length);
    const dw = Math.abs(a.sizeMm.width - b.sizeMm.width) / Math.max(a.sizeMm.width, b.sizeMm.width);
    size = Math.min(1, (dl + dw) * 2);
    sizeW = 0.25;
  }
  const score = !!a.score === !!b.score ? 0 : 1;
  const imprint = a.imprint && b.imprint && a.imprint.trim().toUpperCase() !== b.imprint.trim().toUpperCase() ? 1 : 0;

  const weights = { shape: 0.25, color: 0.3, size: sizeW, twoTone: 0.1, score: 0.05, imprint: 0.05 };
  const total = weights.shape + weights.color + weights.size + weights.twoTone + weights.score + weights.imprint;
  return (
    (weights.shape * shape + weights.color * color + weights.size * size + weights.twoTone * twoTone +
      weights.score * score + weights.imprint * imprint) / total
  );
}

/** Below this, two calibrated pills are flagged as look-alikes. */
export const LOOKALIKE_DISTANCE = 0.15;
