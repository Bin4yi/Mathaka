import type { PillShape, PillSpec } from './types';
import { PILL_COLORS } from './types';

// Pill picture as an SVG string (print / PDF / video). Same geometry, palette, outline,
// shine and score line as tools/generate-assets.mjs and <PillGraphic />.

const INK = '#22283A';

function outline(shape: PillShape): string {
  switch (shape) {
    case 'round':
      return '<circle cx="256" cy="256" r="170"/>';
    case 'oval':
      return '<ellipse cx="256" cy="256" rx="215" ry="140"/>';
    case 'oblong':
      return '<rect x="46" y="166" width="420" height="180" rx="70"/>';
    case 'capsule':
      return '<rect x="36" y="171" width="440" height="170" rx="85"/>';
    case 'diamond':
      return '<polygon points="256,70 450,256 256,442 62,256"/>';
    case 'triangle':
      return '<path d="M256 78 L452 412 Q456 424 442 424 L70 424 Q56 424 60 412 Z"/>';
  }
}

const color = (c: string | undefined, fallback: string) => (c ? (PILL_COLORS as Record<string, string>)[c] ?? c : fallback);
const esc = (s: string) => s.replace(/[<>&"]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[m]!);

export function pillSvg(spec: PillSpec, size = 120, id = 'p'): string {
  const { shape, split = 'none', score = false, imprint = '' } = spec;
  const A = color(spec.colorA, PILL_COLORS.white);
  const B = color(spec.colorB, A);
  const o = outline(shape);
  const tall = shape === 'round' || shape === 'diamond' || shape === 'triangle';
  let fill = `<rect width="512" height="512" fill="${A}"/>`;
  if (split === 'vertical') fill += `<rect x="256" width="256" height="512" fill="${B}"/>`;
  if (split === 'horizontal') fill += `<rect y="256" width="512" height="256" fill="${B}"/>`;
  let marks = '';
  if (split !== 'none') {
    const line = split === 'vertical' ? '<line x1="256" y1="0" x2="256" y2="512"/>' : '<line x1="0" y1="256" x2="512" y2="256"/>';
    marks += `<g clip-path="url(#c${id})" stroke="${INK}" stroke-width="6" opacity="0.55">${line}</g>`;
  }
  if (score) {
    const line = tall ? '<line x1="256" y1="40" x2="256" y2="472"/>' : '<line x1="256" y1="100" x2="256" y2="412"/>';
    marks += `<g clip-path="url(#c${id})" stroke="${INK}" stroke-width="9" stroke-linecap="round" opacity="0.45">${line}</g>`;
  }
  if (imprint) {
    marks += `<text x="${score ? 340 : 256}" y="${shape === 'triangle' ? 330 : 274}" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700" text-anchor="middle" fill="${INK}" opacity="0.55">${esc(imprint)}</text>`;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">` +
    `<defs><clipPath id="c${id}">${o}</clipPath><linearGradient id="s${id}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.1"/></linearGradient></defs>` +
    `<g transform="translate(0 12)" opacity="0.14" fill="#000" stroke="#000" stroke-width="12">${o}</g>` +
    `<g clip-path="url(#c${id})">${fill}<rect width="512" height="512" fill="url(#s${id})"/></g>` +
    marks +
    `<g fill="none" stroke="${INK}" stroke-width="12" stroke-linejoin="round">${o}</g></svg>`
  );
}
