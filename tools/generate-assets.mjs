#!/usr/bin/env node
/**
 * Mathaka asset pack generator
 * ---------------------------------------------------------------
 * Makes every app image as a TRANSPARENT PNG (plus the SVG source).
 * No AI, no internet, same result every run.
 *
 * Usage:
 *   npm run assets   (from the repo root; same as below with --out apps/mobile/assets/generated --preview)
 *   node generate-assets.mjs                 -> writes ./assets/generated
 *   node generate-assets.mjs --out ../app/assets/generated
 *   node generate-assets.mjs --preview       -> also writes preview.png (checkerboard)
 *
 * Output:
 *   <out>/<group>/<name>.png      1x
 *   <out>/<group>/<name>@2x.png   2x
 *   <out>/<group>/<name>@3x.png   3x
 *   <out>/<group>/<name>.svg      vector source
 *   <out>/manifest.json           list of all assets + pill specs
 *   <out>/index.ts                Expo require() map:  import { Assets } from './assets/generated'
 *
 * Pill images use the SAME spec shape as the app's <PillGraphic /> component:
 *   { shape, colorA, colorB?, split, score, imprint? }
 */

import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

// ---------- args ----------
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = path.resolve(outIdx >= 0 ? args[outIdx + 1] : './assets/generated');
const PREVIEW = args.includes('--preview');
const SCALES = [1, 2, 3];

// ---------- design tokens (high contrast, calm, dementia-friendly) ----------
const C = {
  ink: '#22283A',       // outlines: dark, always visible on light or dark bg
  paper: '#FFFFFF',
  sun: '#F6B93B',
  sunDeep: '#E58E26',
  sky: '#4A90C2',
  night: '#3C4A7A',
  moon: '#F7E7A6',
  green: '#2E9E6A',     // taken
  amber: '#F2A541',     // due now
  coral: '#E07A5F',     // missed (soft, not alarming red)
  blue: '#4A7FC1',      // unsure
  rice: '#FFF8E7',
  plate: '#DCE6F0',
  water: '#8EC9EE',
  skin: '#D9A07A',
  teal: '#2A9D8F',
  lid: { morning: '#F6B93B', noon: '#F28C38', evening: '#9B6FB6', night: '#3C4A7A' },
};

// Pill colors. Names are simple words a carer would say.
const PILL_COLORS = {
  white: '#F4F4F2',
  cream: '#F3E6C4',
  yellow: '#F5D547',
  orange: '#F39A3D',
  pink: '#F2A2B8',
  red: '#D9483B',
  blue: '#5B8DD6',
  lightblue: '#A9CDEB',
  green: '#5DAE6B',
  brown: '#9A6B4F',
  purple: '#8E6BBF',
  grey: '#A7ADB5',
};

const SW = 8; // stroke width for 128 icons

// ---------- svg helpers ----------
const svg = (size, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
  (defs ? `<defs>${defs}</defs>` : '') +
  body +
  `</svg>`;

// Soft shadow. Blur filters are slow at 3x, so we use a light offset shadow instead
// (see withShadow). Set FANCY_SHADOW=1 to use a real blur (slower, prettier).
const FANCY = process.env.FANCY_SHADOW === '1';
const shadowDef = (id = 'sh', dy = 6, blur = 6, op = 0.25) =>
  FANCY
    ? `<filter id="${id}" x="-20%" y="-20%" width="140%" height="150%">
         <feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="#000" flood-opacity="${op}"/>
       </filter>`
    : '';
// Wrap content: in fast mode draw a flat, offset, semi-transparent copy behind it.
const withShadow = (content, dy = 8, op = 0.16) =>
  FANCY
    ? `<g filter="url(#sh)">${content}</g>`
    : `<g transform="translate(0 ${dy})" opacity="${op}" style="filter:none">${content
        .replace(/fill="(?!none)[^"]*"/g, 'fill="#000"')
        .replace(/stroke="(?!none)[^"]*"/g, 'stroke="#000"')
        .replace(/<text[\s\S]*?<\/text>/g, '')
        .replace(/<image[^>]*>/g, '')}</g><g>${content}</g>`;

// ---------- PILLS (512 x 512) ----------
function pillOutline(shape) {
  // returns an SVG element string (no fill/stroke) centered in 512 box
  switch (shape) {
    case 'round':   return `<circle cx="256" cy="256" r="170"/>`;
    case 'oval':    return `<ellipse cx="256" cy="256" rx="215" ry="140"/>`;
    case 'oblong':  return `<rect x="46" y="166" width="420" height="180" rx="70"/>`;
    case 'capsule': return `<rect x="36" y="171" width="440" height="170" rx="85"/>`;
    case 'diamond': return `<polygon points="256,70 450,256 256,442 62,256"/>`;
    case 'triangle':return `<path d="M256 78 L452 412 Q456 424 442 424 L70 424 Q56 424 60 412 Z"/>`;
    default: throw new Error('unknown shape ' + shape);
  }
}

function pillSVG(spec) {
  const { shape, colorA, colorB, split = 'none', score = false, imprint = '' } = spec;
  const A = PILL_COLORS[colorA] ?? colorA;
  const B = PILL_COLORS[colorB ?? colorA] ?? colorB;
  const o = pillOutline(shape);
  const defs =
    shadowDef('sh', 10, 10, 0.22) +
    `<clipPath id="clip">${o}</clipPath>
     <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0" stop-color="#fff" stop-opacity="0.55"/>
       <stop offset="0.45" stop-color="#fff" stop-opacity="0"/>
       <stop offset="1" stop-color="#000" stop-opacity="0.10"/>
     </linearGradient>`;

  let fill = `<rect x="0" y="0" width="512" height="512" fill="${A}"/>`;
  if (split === 'vertical') fill += `<rect x="256" y="0" width="256" height="512" fill="${B}"/>`;
  if (split === 'horizontal') fill += `<rect x="0" y="256" width="512" height="256" fill="${B}"/>`;

  let marks = '';
  if (split !== 'none') {
    const line = split === 'vertical'
      ? `<line x1="256" y1="0" x2="256" y2="512"/>`
      : `<line x1="0" y1="256" x2="512" y2="256"/>`;
    marks += `<g clip-path="url(#clip)" stroke="${C.ink}" stroke-width="6" opacity="0.55">${line}</g>`;
  }
  if (score) {
    // score line across the short axis
    const tall = shape === 'round' || shape === 'diamond' || shape === 'triangle';
    const line = tall
      ? `<line x1="256" y1="40" x2="256" y2="472"/>`
      : `<line x1="256" y1="100" x2="256" y2="412"/>`;
    marks += `<g clip-path="url(#clip)" stroke="${C.ink}" stroke-width="9" stroke-linecap="round" opacity="0.45">${line}</g>`;
  }
  if (imprint) {
    marks += `<text x="${score ? 340 : 256}" y="${shape === 'triangle' ? 330 : 274}" font-family="Arial, Helvetica, sans-serif"
      font-size="54" font-weight="700" text-anchor="middle" fill="${C.ink}" opacity="0.55">${imprint}</text>`;
  }

  const pill =
    `<g clip-path="url(#clip)">${fill}<rect x="0" y="0" width="512" height="512" fill="url(#shine)"/></g>
     ${marks}
     <g fill="none" stroke="${C.ink}" stroke-width="12" stroke-linejoin="round">${o}</g>`;
  const body = FANCY
    ? `<g filter="url(#sh)">${pill}</g>`
    : `<g transform="translate(0 12)" fill="#000" stroke="#000" stroke-width="12" stroke-linejoin="round" opacity="0.14">${o}</g>${pill}`;
  return svg(512, body, defs);
}

function pillLibrary() {
  const list = [];
  const shapes = ['round', 'oval', 'oblong', 'capsule', 'diamond', 'triangle'];
  const solid = ['white', 'cream', 'yellow', 'orange', 'pink', 'red', 'blue', 'lightblue', 'green', 'brown', 'purple', 'grey'];
  for (const shape of shapes) {
    if (shape === 'capsule') continue; // capsules are two-tone below
    for (const c of solid) list.push({ name: `pill-${shape}-${c}`, spec: { shape, colorA: c } });
  }
  // scored versions of common tablets
  for (const c of ['white', 'yellow', 'pink', 'orange']) {
    list.push({ name: `pill-round-${c}-scored`, spec: { shape: 'round', colorA: c, score: true } });
    list.push({ name: `pill-oblong-${c}-scored`, spec: { shape: 'oblong', colorA: c, score: true } });
  }
  // two-tone capsules
  const capPairs = [
    ['red', 'white'], ['blue', 'white'], ['green', 'cream'], ['yellow', 'red'], ['purple', 'white'],
    ['orange', 'brown'], ['lightblue', 'blue'], ['pink', 'white'], ['grey', 'yellow'], ['green', 'yellow'],
  ];
  for (const [a, b] of capPairs)
    list.push({ name: `pill-capsule-${a}-${b}`, spec: { shape: 'capsule', colorA: a, colorB: b, split: 'vertical' } });
  // two-tone tablets
  for (const [a, b] of [['red', 'white'], ['blue', 'white'], ['yellow', 'white']])
    list.push({ name: `pill-round-${a}-${b}-split`, spec: { shape: 'round', colorA: a, colorB: b, split: 'horizontal' } });
  // demo pills with imprint (used in the hackathon demo)
  list.push({ name: 'demo-sugar-pill', spec: { shape: 'oblong', colorA: 'white', score: true, imprint: '500' } });
  list.push({ name: 'demo-pressure-pill', spec: { shape: 'round', colorA: 'pink', imprint: '5' } });
  list.push({ name: 'demo-cholesterol-pill', spec: { shape: 'oval', colorA: 'yellow', imprint: '10' } });
  list.push({ name: 'demo-heart-capsule', spec: { shape: 'capsule', colorA: 'red', colorB: 'white', split: 'vertical' } });
  return list.map((p) => ({ ...p, group: 'pills', size: 512, svg: pillSVG(p.spec) }));
}

// ---------- ICONS (128 x 128) ----------
const st = (color = C.ink, w = SW) => `stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

function sunRays(cx, cy, r1, r2, n, from = 0, to = 360) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = ((from + ((to - from) * i) / (n - (to - from === 360 ? 0 : 1))) * Math.PI) / 180;
    s += `<line x1="${cx + r1 * Math.cos(a)}" y1="${cy + r1 * Math.sin(a)}" x2="${cx + r2 * Math.cos(a)}" y2="${cy + r2 * Math.sin(a)}"/>`;
  }
  return s;
}

const ICONS = {
  // --- time of day ---
  'time-morning': svg(128,
    `<g ${st()} fill="none">${sunRays(64, 82, 34, 46, 5, 180, 360)}</g>
     <path d="M30 82 A34 34 0 0 1 98 82 Z" fill="${C.sun}" ${st()}/>
     <line x1="12" y1="96" x2="116" y2="96" ${st()}/>`),
  'time-noon': svg(128,
    `<g ${st()} fill="none">${sunRays(64, 64, 36, 50, 8)}</g>
     <circle cx="64" cy="64" r="26" fill="${C.sun}" ${st()}/>`),
  'time-evening': svg(128,
    `<path d="M30 82 A34 34 0 0 1 98 82 Z" fill="${C.sunDeep}" ${st()}/>
     <line x1="12" y1="82" x2="116" y2="82" ${st()}/>
     <line x1="28" y1="98" x2="100" y2="98" ${st()}/>
     <line x1="44" y1="112" x2="84" y2="112" ${st()}/>`),
  'time-night': svg(128,
    `<path d="M78 22 A42 42 0 1 0 106 92 A34 34 0 1 1 78 22 Z" fill="${C.moon}" ${st()}/>
     <g fill="${C.moon}" ${st(C.ink, 5)}>
       <path d="M96 30 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 z"/>
     </g>`),

  // --- meals ---
  'meal-before': svg(128,
    `<ellipse cx="64" cy="76" rx="50" ry="22" fill="${C.plate}" ${st()}/>
     <ellipse cx="64" cy="72" rx="30" ry="11" fill="none" ${st(C.ink, 5)} opacity="0.5"/>
     <circle cx="64" cy="30" r="20" fill="${C.paper}" ${st(C.ink, 6)}/>
     <path d="M64 19 V30 L72 36" fill="none" ${st(C.ink, 6)}/>`),
  'meal-after': svg(128,
    `<ellipse cx="64" cy="80" rx="50" ry="22" fill="${C.plate}" ${st()}/>
     <path d="M34 74 Q64 30 94 74 Z" fill="${C.rice}" ${st()}/>
     <circle cx="84" cy="80" r="7" fill="${C.sunDeep}" ${st(C.ink, 4)}/>`),
  'water-glass': svg(128,
    `<path d="M34 18 H94 L86 112 H42 Z" fill="${C.paper}" ${st()}/>
     <path d="M38.5 52 H89.5 L86 108 H42 Z" fill="${C.water}"/>
     <path d="M34 18 H94 L86 112 H42 Z" fill="none" ${st()}/>`),

  // --- status ---
  'status-taken': svg(128,
    `<circle cx="64" cy="64" r="52" fill="${C.green}" ${st()}/>
     <path d="M38 66 L56 84 L92 46" fill="none" ${st(C.paper, 12)}/>`),
  'status-due': svg(128,
    `<path d="M64 14 C40 14 32 34 32 54 V78 L20 96 H108 L96 78 V54 C96 34 88 14 64 14 Z" fill="${C.amber}" ${st()}/>
     <path d="M52 104 A12 12 0 0 0 76 104" fill="none" ${st()}/>`),
  'status-missed': svg(128,
    `<circle cx="64" cy="64" r="52" fill="${C.coral}" ${st()}/>
     <line x1="64" y1="34" x2="64" y2="72" ${st(C.paper, 12)}/>
     <circle cx="64" cy="94" r="7" fill="${C.paper}"/>`),
  'status-unsure': svg(128,
    `<circle cx="64" cy="64" r="52" fill="${C.blue}" ${st()}/>
     <path d="M46 50 A18 18 0 1 1 70 66 Q64 70 64 78" fill="none" ${st(C.paper, 11)}/>
     <circle cx="64" cy="96" r="7" fill="${C.paper}"/>`),

  // --- actions / people ---
  'ask-did-i-take': svg(128,
    `<path d="M14 22 H114 V84 H58 L34 108 V84 H14 Z" fill="${C.paper}" ${st()}/>
     <circle cx="48" cy="53" r="16" fill="${PILL_COLORS.pink}" ${st(C.ink, 6)}/>
     <path d="M76 44 A10 10 0 1 1 88 56 Q84 58 84 64" fill="none" ${st(C.ink, 7)}/>
     <circle cx="84" cy="73" r="4" fill="${C.ink}"/>`),
  'speaker': svg(128,
    `<path d="M18 50 H40 L68 26 V102 L40 78 H18 Z" fill="${C.teal}" ${st()}/>
     <path d="M84 46 Q96 64 84 82" fill="none" ${st()}/>
     <path d="M96 34 Q116 64 96 94" fill="none" ${st()}/>`),
  'camera': svg(128,
    `<path d="M14 42 H38 L46 28 H82 L90 42 H114 V104 H14 Z" fill="${C.sky}" ${st()}/>
     <circle cx="64" cy="72" r="20" fill="${C.paper}" ${st()}/>
     <circle cx="64" cy="72" r="8" fill="${C.ink}"/>`),
  'family': svg(128,
    `<circle cx="44" cy="40" r="16" fill="${C.skin}" ${st()}/>
     <path d="M16 108 V92 A28 28 0 0 1 72 92 V108 Z" fill="${C.teal}" ${st()}/>
     <circle cx="88" cy="50" r="13" fill="${C.skin}" ${st()}/>
     <path d="M66 108 V96 A22 22 0 0 1 110 96 V108 Z" fill="${C.amber}" ${st()}/>`),
  'pharmacist': svg(128,
    `<circle cx="64" cy="38" r="20" fill="${C.skin}" ${st()}/>
     <path d="M22 116 V98 A42 42 0 0 1 106 98 V116 Z" fill="${C.paper}" ${st()}/>
     <rect x="74" y="84" width="22" height="22" rx="4" fill="${C.green}" ${st(C.ink, 5)}/>
     <path d="M85 89 V101 M79 95 H91" ${st(C.paper, 4)}/>`),
  'elder': svg(128,
    `<circle cx="64" cy="40" r="22" fill="${C.skin}" ${st()}/>
     <path d="M42 34 Q64 4 86 34" fill="#E9E9E9" ${st()}/>
     <path d="M20 116 V100 A44 44 0 0 1 108 100 V116 Z" fill="${C.lid.evening}" ${st()}/>`),
  'lock': svg(128,
    `<path d="M40 56 V40 A24 24 0 0 1 88 40 V56" fill="none" ${st()}/>
     <rect x="26" y="56" width="76" height="58" rx="10" fill="${C.amber}" ${st()}/>
     <circle cx="64" cy="82" r="8" fill="${C.ink}"/><line x1="64" y1="86" x2="64" y2="98" ${st()}/>`),
  'refill': svg(128,
    `<rect x="36" y="16" width="56" height="18" rx="4" fill="${C.paper}" ${st()}/>
     <path d="M40 34 H88 V108 A8 8 0 0 1 80 116 H48 A8 8 0 0 1 40 108 Z" fill="${C.sunDeep}" ${st()}/>
     <rect x="40" y="58" width="48" height="30" fill="${C.paper}" ${st(C.ink, 5)}/>
     <path d="M54 73 H74 M64 63 V83" ${st(C.ink, 6)}/>`),
  'calendar-clinic': svg(128,
    `<rect x="16" y="24" width="96" height="88" rx="10" fill="${C.paper}" ${st()}/>
     <path d="M16 48 H112" ${st()}/><path d="M40 14 V32 M88 14 V32" ${st()}/>
     <rect x="48" y="60" width="32" height="32" rx="4" fill="${C.green}" ${st(C.ink, 5)}/>
     <path d="M64 66 V86 M54 76 H74" ${st(C.paper, 6)}/>`),
  'warning-lookalike': svg(128,
    `<path d="M64 12 L118 108 H10 Z" fill="${C.amber}" ${st()}/>
     <circle cx="48" cy="80" r="11" fill="${C.paper}" ${st(C.ink, 5)}/>
     <circle cx="80" cy="80" r="11" fill="${C.paper}" ${st(C.ink, 5)}/>
     <path d="M64 70 V90" ${st(C.ink, 4)} opacity="0.6"/>`),
  'check-photo': svg(128,
    `<path d="M14 42 H38 L46 28 H82 L90 42 H114 V104 H14 Z" fill="${C.sky}" ${st()}/>
     <circle cx="64" cy="72" r="22" fill="${C.green}" ${st()}/>
     <path d="M53 72 L61 80 L76 64" fill="none" ${st(C.paper, 7)}/>`),
};

function iconList() {
  return Object.entries(ICONS).map(([name, s]) => ({ name, group: 'icons', size: 128, svg: s }));
}

// ---------- ILLUSTRATIONS (512 x 512) ----------
function pillboxSVG(openSlot = null) {
  const slots = ['morning', 'noon', 'evening', 'night'];
  const iconFor = { morning: 'time-morning', noon: 'time-noon', evening: 'time-evening', night: 'time-night' };
  let g = `<rect x="40" y="150" width="432" height="250" rx="34" fill="#EEF1F5" stroke="${C.ink}" stroke-width="12"/>`;
  slots.forEach((s, i) => {
    const x = 62 + i * 100;
    const open = openSlot === s;
    g += `<rect x="${x}" y="176" width="88" height="198" rx="18" fill="${open ? '#FFFDF5' : C.lid[s]}" stroke="${C.ink}" stroke-width="10"/>`;
    if (open) {
      g += `<rect x="${x - 6}" y="104" width="100" height="58" rx="16" fill="${C.lid[s]}" stroke="${C.ink}" stroke-width="10" transform="rotate(-14 ${x + 44} 160)"/>`;
      g += `<circle cx="${x + 44}" cy="300" r="22" fill="${PILL_COLORS.pink}" stroke="${C.ink}" stroke-width="7"/>`;
      g += `<rect x="${x + 16}" y="250" width="56" height="26" rx="13" fill="${PILL_COLORS.white}" stroke="${C.ink}" stroke-width="7"/>`;
      // glow
      g += `<rect x="${x - 10}" y="166" width="108" height="218" rx="24" fill="none" stroke="${C.amber}" stroke-width="8" opacity="0.8"/>`;
    }
    // small time icon (nested svg)
    const inner = ICONS[iconFor[s]].replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    g += `<g transform="translate(${x + 14} ${open ? 190 : 210}) scale(0.47)">${inner}</g>`;
  });
  return svg(512, withShadow(g, 10), shadowDef('sh', 10, 10, 0.2));
}

function bigButtonSVG() {
  // the one big elder button: "Did I take my medicine?"
  const inner = ICONS['ask-did-i-take'].replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return svg(512,
    withShadow(`
       <circle cx="256" cy="256" r="220" fill="${C.teal}" stroke="${C.ink}" stroke-width="14"/>
       <circle cx="256" cy="256" r="186" fill="none" stroke="#fff" stroke-width="8" opacity="0.5"/>
       <g transform="translate(128 128) scale(2)">${inner}</g>`, 12), shadowDef('sh', 12, 12, 0.25));
}

function phoneAlertSVG() {
  const taken = ICONS['status-taken'].replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return svg(512,
    withShadow(`
       <rect x="146" y="40" width="220" height="432" rx="36" fill="#2E3446" stroke="${C.ink}" stroke-width="12"/>
       <rect x="166" y="80" width="180" height="352" rx="14" fill="#F7F9FC"/>
       <rect x="182" y="120" width="148" height="112" rx="16" fill="#fff" stroke="${C.ink}" stroke-width="6"/>
       <g transform="translate(200 132) scale(0.7)">${taken}</g>
       <rect x="292" y="152" width="26" height="10" rx="5" fill="${C.ink}" opacity="0.5"/>
       <rect x="292" y="172" width="20" height="10" rx="5" fill="${C.ink}" opacity="0.3"/>
       <rect x="182" y="256" width="148" height="18" rx="9" fill="${C.ink}" opacity="0.15"/>
       <rect x="182" y="288" width="110" height="18" rx="9" fill="${C.ink}" opacity="0.15"/>
       <rect x="226" y="54" width="60" height="10" rx="5" fill="#556"/>`, 12), shadowDef('sh', 12, 12, 0.25));
}

function logoSVG(size = 1024, inset = 1) {
  // pill box with a heart-shaped memory spark. Transparent background.
  // inset < 1 shrinks the art around the centre (Android adaptive icons crop the outer third).
  const s = (size / 512) * inset;
  const pad = (size * (1 - inset)) / 2;
  return svg(size,
    `<g transform="translate(${pad} ${pad}) scale(${s})">${withShadow(`
       <rect x="76" y="176" width="360" height="250" rx="48" fill="${C.teal}" stroke="${C.ink}" stroke-width="14"/>
       <rect x="62" y="128" width="388" height="80" rx="30" fill="#36B3A3" stroke="${C.ink}" stroke-width="14"/>
       <path d="M256 384 C170 324 150 292 150 262 A50 50 0 0 1 256 238 A50 50 0 0 1 362 262 C362 292 342 324 256 384 Z"
             fill="${C.paper}" stroke="${C.ink}" stroke-width="12" stroke-linejoin="round"/>
       <circle cx="226" cy="282" r="20" fill="${PILL_COLORS.pink}" stroke="${C.ink}" stroke-width="7"/>
       <rect x="252" y="270" width="64" height="26" rx="13" fill="${C.sun}" stroke="${C.ink}" stroke-width="7"/>
       <path d="M256 60 L264 92 L296 100 L264 108 L256 140 L248 108 L216 100 L248 92 Z" fill="${C.moon}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>`, 10)}
     </g>`, shadowDef('sh', 10, 10, 0.2));
}

function calibrationMatSVG() {
  // Printable mat for pill photos. Transparent PNG; print on WHITE paper.
  // 1 unit = 1 mm at print size (A6 landscape 148 x 105 mm).
  const W = 148, H = 105;
  let g = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="4" fill="none" stroke="${C.ink}" stroke-width="0.8"/>`;
  // light grid every 5mm
  for (let x = 10; x < W - 5; x += 5) g += `<line x1="${x}" y1="10" x2="${x}" y2="${H - 10}" stroke="${C.ink}" stroke-width="${x % 10 === 0 ? 0.25 : 0.12}" opacity="0.5"/>`;
  for (let y = 10; y < H - 5; y += 5) g += `<line x1="10" y1="${y}" x2="${W - 10}" y2="${y}" stroke="${C.ink}" stroke-width="${y % 10 === 0 ? 0.25 : 0.12}" opacity="0.5"/>`;
  // corner markers (for perspective fix)
  const corner = (x, y) => `<rect x="${x}" y="${y}" width="8" height="8" fill="${C.ink}"/><rect x="${x + 2}" y="${y + 2}" width="4" height="4" fill="#fff"/>`;
  g += corner(4, 4) + corner(W - 12, 4) + corner(4, H - 12) + corner(W - 12, H - 12);
  // size references
  g += `<circle cx="128" cy="24" r="5" fill="none" stroke="${C.ink}" stroke-width="0.6"/><text x="128" y="35" font-size="3.2" text-anchor="middle" font-family="Arial">10 mm</text>`;
  g += `<rect x="113" y="74" width="30" height="0.8" fill="${C.ink}"/><text x="128" y="80" font-size="3.2" text-anchor="middle" font-family="Arial">30 mm</text>`;
  // colour reference strip (helps fix camera colour)
  const refs = ['#FFFFFF', '#808080', '#000000', '#D9483B', '#5DAE6B', '#5B8DD6', '#F5D547'];
  refs.forEach((c, i) => (g += `<rect x="${14 + i * 9}" y="${H - 22}" width="8" height="8" fill="${c}" stroke="${C.ink}" stroke-width="0.3"/>`));
  // pill placement circle
  g += `<circle cx="60" cy="46" r="24" fill="none" stroke="${C.teal}" stroke-width="0.8" stroke-dasharray="2 1.5"/>`;
  g += `<text x="60" y="76" font-size="3.6" text-anchor="middle" font-family="Arial" fill="${C.ink}">Place ONE pill here</text>`;
  g += `<text x="10" y="${H - 4.5}" font-size="3" font-family="Arial" fill="${C.ink}">Mathaka calibration mat · print at 100% (A6)</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

function illustrationList() {
  const list = [
    { name: 'pillbox-closed', svg: pillboxSVG(null) },
    { name: 'pillbox-open-morning', svg: pillboxSVG('morning') },
    { name: 'pillbox-open-noon', svg: pillboxSVG('noon') },
    { name: 'pillbox-open-evening', svg: pillboxSVG('evening') },
    { name: 'pillbox-open-night', svg: pillboxSVG('night') },
    { name: 'big-button-did-i-take', svg: bigButtonSVG() },
    { name: 'phone-alert-taken', svg: phoneAlertSVG() },
  ];
  return list.map((x) => ({ ...x, group: 'illustrations', size: 512 }));
}

function brandList() {
  return [
    { name: 'logo', group: 'brand', size: 1024, svg: logoSVG(1024) },
    { name: 'adaptive-icon-foreground', group: 'brand', size: 1024, svg: logoSVG(1024, 0.62) },
    { name: 'calibration-mat', group: 'print', size: 1748, svg: calibrationMatSVG(), fitWidth: 1748 }, // ~300dpi A6
  ];
}

// ---------- render ----------
function render(svgStr, width) {
  const r = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: width },
    background: 'rgba(0,0,0,0)', // transparent
    font: { loadSystemFonts: /<text/.test(svgStr), defaultFontFamily: 'Arial' },
  });
  return r.render().asPng();
}

function writeAsset(a) {
  const dir = path.join(OUT, a.group);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${a.name}.svg`), a.svg);
  const files = {};
  if (a.fitWidth) {
    const f = `${a.name}.png`;
    fs.writeFileSync(path.join(dir, f), render(a.svg, a.fitWidth));
    files['1x'] = `${a.group}/${f}`;
    return files;
  }
  for (const s of SCALES) {
    const f = s === 1 ? `${a.name}.png` : `${a.name}@${s}x.png`;
    fs.writeFileSync(path.join(dir, f), render(a.svg, a.size * s));
    files[`${s}x`] = `${a.group}/${f}`;
  }
  return files;
}

function camel(name) {
  return name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function main() {
  const all = [...brandList(), ...iconList(), ...illustrationList(), ...pillLibrary()];
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = { generatedAt: new Date().toISOString(), transparent: true, pillColors: PILL_COLORS, assets: [] };
  for (const a of all) {
    const files = writeAsset(a);
    manifest.assets.push({ name: a.name, group: a.group, size: a.size, files, ...(a.spec ? { spec: a.spec } : {}) });
    process.stdout.write('.');
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Expo require() map (Metro picks @2x/@3x automatically)
  const groups = {};
  for (const a of all) (groups[a.group] ??= []).push(a);
  let ts = `// AUTO-GENERATED by generate-assets.mjs — do not edit\n/* eslint-disable */\nexport const Assets = {\n`;
  for (const [g, items] of Object.entries(groups)) {
    ts += `  ${g}: {\n`;
    for (const a of items) ts += `    ${camel(a.name)}: require('./${g}/${a.name}.png'),\n`;
    ts += `  },\n`;
  }
  ts += `} as const;\n\nexport const PillLibrary = ${JSON.stringify(
    all.filter((a) => a.spec).map((a) => ({ key: camel(a.name), ...a.spec })), null, 2)} as const;\n`;
  fs.writeFileSync(path.join(OUT, 'index.ts'), ts);

  if (PREVIEW) writePreview(all);
  console.log(`\nDone: ${all.length} assets -> ${OUT}`);
}

function writePreview(all) {
  // contact sheet on a checkerboard so transparency is visible
  const cell = 150, cols = 10;
  const items = all.filter((a) => a.group !== 'print');
  const rows = Math.ceil(items.length / cols);
  const W = cols * cell, H = rows * (cell + 22);
  let body = `<defs><pattern id="ck" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="#fff"/><rect width="10" height="10" fill="#ddd"/><rect x="10" y="10" width="10" height="10" fill="#ddd"/></pattern></defs>
    <rect width="${W}" height="${H}" fill="url(#ck)"/>`;
  items.forEach((a, i) => {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * (cell + 22);
    const b64 = Buffer.from(render(a.svg, 256)).toString('base64');
    body += `<image href="data:image/png;base64,${b64}" x="${x + 15}" y="${y + 8}" width="${cell - 30}" height="${cell - 30}"/>`;
    body += `<text x="${x + cell / 2}" y="${y + cell + 6}" font-size="11" text-anchor="middle" font-family="Arial">${a.name.slice(0, 24)}</text>`;
  });
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
  const r = new Resvg(sheet, { fitTo: { mode: 'original' }, font: { loadSystemFonts: true } });
  fs.writeFileSync(path.join(OUT, 'preview.png'), r.render().asPng());
  console.log('\npreview.png written');
}

main();
