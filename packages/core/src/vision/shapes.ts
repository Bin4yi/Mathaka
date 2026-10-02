import type { PillShape } from '../types';

/**
 * Is (u, v) inside the pill outline? u along the length, v along the width,
 * both in [-0.5, 0.5] of the bounding box. Same outlines as the asset script / PillGraphic.
 * Used to draw synthetic test photos.
 */
export function insideShape(shape: PillShape, u: number, v: number, lengthMm: number, widthMm: number): boolean {
  const au = Math.abs(u), av = Math.abs(v);
  if (au > 0.5 || av > 0.5) return false;
  switch (shape) {
    case 'round':
    case 'oval':
      // ellipse filling the box (a circle when length == width)
      return u * u + v * v <= 0.25;
    case 'oblong':
    case 'capsule': {
      // rounded rectangle; corner radius as a fraction of the WIDTH (asset: oblong 70/180, capsule 85/170)
      const rw = shape === 'capsule' ? 0.5 : 70 / 180;
      const ru = (rw * widthMm) / lengthMm; // same radius in u units
      const cu = 0.5 - ru, cv = 0.5 - rw;
      if (au <= cu || av <= cv) return true;
      return ((au - cu) / ru) ** 2 + ((av - cv) / rw) ** 2 <= 1;
    }
    case 'diamond':
      return au + av <= 0.5;
    case 'triangle':
      // apex at v = -0.5 (top), base at v = +0.5
      return au <= (v + 0.5) / 2;
  }
}
