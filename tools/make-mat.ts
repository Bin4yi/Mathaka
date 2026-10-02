/**
 * Printable calibration mat: A6 PDF (vector, exact mm) + PNG (300 dpi) + SVG.
 * Uses the SAME layout (packages/core/src/vision/mat.ts) and the SAME marker dictionary
 * as the measuring pipeline, so the phone can find what we print.
 *
 *   npm run mat        -> apps/mobile/assets/mat/calibration-mat.{pdf,png,svg}
 *
 * Print at 100% ("actual size"), not "fit to page". Check: the ring must be 10 mm across.
 */
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { MAT } from '../packages/core/src/vision/mat';
import { AR } from '../packages/core/src/vision/vendor/aruco';

type Rect = { x: number; y: number; w: number; h: number; fill: string };
type Circle = { cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number; dash?: boolean };
type Label = { x: number; y: number; size: number; text: string; anchor?: 'start' | 'middle' };

const INK = '#22283A';
const rects: Rect[] = [];
const circles: Circle[] = [];
const labels: Label[] = [];

// markers: 8 x 8 cells (black border + 6 x 6 bits), white quiet zone is the paper around it
const dict = new AR.Dictionary(MAT.dictionary);
const cell = MAT.markerSize / 8;
for (const m of MAT.markers) {
  const bits = dict.codeList[m.id]!;
  rects.push({ x: m.x, y: m.y, w: MAT.markerSize, h: MAT.markerSize, fill: '#000000' });
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      if (bits[r * 6 + c] === '1') rects.push({ x: m.x + (c + 1) * cell, y: m.y + (r + 1) * cell, w: cell, h: cell, fill: '#FFFFFF' });
    }
  }
}
// placement disc + guide
const d = MAT.disc;
circles.push({ cx: d.cx, cy: d.cy, r: d.r, fill: d.color });
circles.push({ cx: d.cx, cy: d.cy, r: d.r - 6, stroke: '#6B6F78', sw: 0.3, dash: true });
labels.push({ x: d.cx, y: d.cy + d.r + 5, size: 3.6, text: 'Place ONE pill in the dark circle', anchor: 'middle' });
// colour references
for (const p of [MAT.grey, MAT.black, ...MAT.swatches]) rects.push({ x: p.x, y: p.y, w: p.w, h: p.h, fill: p.color });
labels.push({ x: MAT.grey.x, y: MAT.grey.y - 1.5, size: 2.6, text: '50% grey' });
labels.push({ x: MAT.black.x, y: MAT.black.y - 1.5, size: 2.6, text: 'black' });
// 10 mm ring (outer diameter)
circles.push({ cx: MAT.ring.cx, cy: MAT.ring.cy, r: MAT.ring.r - MAT.ring.stroke / 2, stroke: INK, sw: MAT.ring.stroke });
labels.push({ x: MAT.ring.cx, y: MAT.ring.cy + MAT.ring.r + 4, size: 2.6, text: '10 mm', anchor: 'middle' });
labels.push({ x: 30, y: 9, size: 3.4, text: 'Mathaka calibration mat' });
labels.push({ x: 30, y: 13.5, size: 2.6, text: 'Print at 100% (actual size), A6. The ring must be 10 mm across.' });
labels.push({ x: 30, y: 101, size: 2.4, text: `Markers: ${MAT.dictionary} ids 0-3. Keep all 4 corners in the photo.` });

// ---------- SVG ----------
function svg(): string {
  let b = `<rect x="0" y="0" width="${MAT.width}" height="${MAT.height}" fill="#FFFFFF"/>`;
  for (const r of rects) b += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}"/>`;
  for (const c of circles) {
    b += `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${c.fill ?? 'none'}"${c.stroke ? ` stroke="${c.stroke}" stroke-width="${c.sw}"` : ''}${c.dash ? ' stroke-dasharray="1.5 1"' : ''}/>`;
  }
  for (const l of labels) {
    b += `<text x="${l.x}" y="${l.y}" font-size="${l.size}" font-family="Arial, Helvetica, sans-serif" fill="${INK}" text-anchor="${l.anchor ?? 'start'}">${l.text}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${MAT.width}mm" height="${MAT.height}mm" viewBox="0 0 ${MAT.width} ${MAT.height}">${b}</svg>`;
}

// ---------- PDF (hand-written, vector, 1 page) ----------
function pdf(): Buffer {
  const k = 72 / 25.4; // mm -> pt
  const W = MAT.width * k, H = MAT.height * k;
  const col = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(' ');
  };
  const X = (x: number) => (x * k).toFixed(3);
  const Y = (y: number) => (H - y * k).toFixed(3);
  const ops: string[] = [];
  for (const r of rects) ops.push(`${col(r.fill)} rg ${X(r.x)} ${Y(r.y + r.h)} ${(r.w * k).toFixed(3)} ${(r.h * k).toFixed(3)} re f`);
  for (const c of circles) {
    const m = 0.5523 * c.r;
    const p = (x: number, y: number) => `${X(x)} ${Y(y)}`;
    const path =
      `${p(c.cx + c.r, c.cy)} m ` +
      `${p(c.cx + c.r, c.cy + m)} ${p(c.cx + m, c.cy + c.r)} ${p(c.cx, c.cy + c.r)} c ` +
      `${p(c.cx - m, c.cy + c.r)} ${p(c.cx - c.r, c.cy + m)} ${p(c.cx - c.r, c.cy)} c ` +
      `${p(c.cx - c.r, c.cy - m)} ${p(c.cx - m, c.cy - c.r)} ${p(c.cx, c.cy - c.r)} c ` +
      `${p(c.cx + m, c.cy - c.r)} ${p(c.cx + c.r, c.cy - m)} ${p(c.cx + c.r, c.cy)} c`;
    if (c.fill) ops.push(`${col(c.fill)} rg ${path} f`);
    if (c.stroke) ops.push(`${c.dash ? `[${(1.5 * k).toFixed(2)} ${(1 * k).toFixed(2)}] 0 d ` : ''}${col(c.stroke)} RG ${((c.sw ?? 0.3) * k).toFixed(3)} w ${path} S [] 0 d`);
  }
  for (const l of labels) {
    const size = l.size * k;
    // Helvetica average width ~0.5 em, good enough to centre short labels
    const x = l.anchor === 'middle' ? l.x * k - (l.text.length * size * 0.5) / 2 : l.x * k;
    const text = l.text.replace(/[\\()]/g, (m) => `\\${m}`);
    ops.push(`BT /F1 ${size.toFixed(2)} Tf ${col(INK)} rg ${x.toFixed(3)} ${Y(l.y)} Td (${text}) Tj ET`);
  }
  const content = ops.join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(3)} ${H.toFixed(3)}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

const outDir = path.resolve('apps/mobile/assets/mat');
fs.mkdirSync(outDir, { recursive: true });
const svgText = svg();
fs.writeFileSync(path.join(outDir, 'calibration-mat.svg'), svgText);
const png = new Resvg(svgText, {
  fitTo: { mode: 'width', value: Math.round((MAT.width / 25.4) * 300) },
  font: { loadSystemFonts: true, defaultFontFamily: 'Arial' },
}).render().asPng();
fs.writeFileSync(path.join(outDir, 'calibration-mat.png'), png);
fs.writeFileSync(path.join(outDir, 'calibration-mat.pdf'), pdf());
console.log(`mat: ${outDir}\\calibration-mat.{pdf,png,svg}`);
