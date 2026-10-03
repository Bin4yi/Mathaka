// Renders the real pill-vision stages (packages/core) to images for the promo video.
// Run from the repo root: npx tsx videos/mathaka-promo/scripts/vision-frames.ts
import fs from 'node:fs';
import path from 'node:path';
import * as M from '@mathaka/core';
const V = ((M as any).default ?? M) as typeof M;
const { synthPhoto, analyzePillPhoto, detectMat, warpMat, encodeBmp } = V;
const PX_PER_MM = 4;

const out = path.resolve('videos/mathaka-promo/assets/vision');
fs.mkdirSync(out, { recursive: true });
const pills = {
  sugar: { shape: 'oblong', colorA: 'white', score: true, imprint: '500', sizeMm: { length: 19, width: 9 } },
  capsule: { shape: 'capsule', colorA: 'red', colorB: 'white', split: 'vertical', sizeMm: { length: 18, width: 6 } },
} as const;
const result: Record<string, unknown> = {};
for (const [name, spec] of Object.entries(pills)) {
  const photo = synthPhoto(spec as never, { width: 1600, height: 1200, rotateDeg: 14, tilt: 0.12, light: [1.08, 1, 0.86], pillAngleDeg: 28, seed: 7 });
  fs.writeFileSync(path.join(out, `${name}-photo.bmp`), encodeBmp(photo));
  const mat = detectMat(photo);
  if (mat.h) fs.writeFileSync(path.join(out, `${name}-warp.bmp`), encodeBmp(warpMat(photo, mat.h, PX_PER_MM, 'all')));
  const a = analyzePillPhoto(photo);
  fs.writeFileSync(path.join(out, `${name}-view.bmp`), encodeBmp(a.view));
  const { labA, labB, ...f } = a.features ?? ({} as never);
  result[name] = { markers: mat.markers, reprojErrorPx: mat.error, features: f, timingsMs: a.timingsMs };
}
fs.writeFileSync(path.join(out, 'analysis.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
