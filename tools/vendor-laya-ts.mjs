#!/usr/bin/env node
/**
 * Vendor the official Laya TypeScript runtime (laya-ts, Apache-2.0) into packages/laya-ts.
 *
 *   node tools/vendor-laya-ts.mjs            # uses the pinned commit below
 *
 * Why vendor and patch: laya-ts is not on npm, and its loaders use node:fs and dynamic
 * imports that React Native's bundler (Metro) cannot handle. We keep the decision code
 * as-is and only:
 *   1. drop Agent.load() and loadTokenizerJson() (we build the Agent with our own provider),
 *   2. keep only the provider TYPES and feed helpers from providers.ts,
 *   3. turn "./x.js" imports into "./x".
 * Inference logic (tokenizer, option encoding, [MASK] markers, temperatures) is unchanged.
 */
import fs from 'node:fs';
import path from 'node:path';

const COMMIT = '469c167bc76e22b944b7518b51e0815c4189aed8';
const BASE = `https://raw.githubusercontent.com/NandhaKishorM/laya/${COMMIT}`;
const OUT = path.resolve('packages/laya-ts/src');
const FILES = ['agent', 'common', 'tokenizer', 'structured', 'hooks'];

async function get(rel) {
  const res = await fetch(`${BASE}/${rel}`);
  if (!res.ok) throw new Error(`${rel}: HTTP ${res.status}`);
  return res.text();
}

/** Remove a top-level/class member that starts at `startRe` by matching braces. */
function cut(src, startRe, what) {
  const m = startRe.exec(src);
  if (!m) throw new Error(`not found: ${what}`);
  let i = src.indexOf('{', m.index + m[0].length - 1);
  // skip a parameter list that itself contains braces (object types)
  const paren = src.indexOf('(', m.index);
  if (paren >= 0 && paren < i) {
    let depth = 0;
    for (let j = paren; j < src.length; j++) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')' && --depth === 0) {
        i = src.indexOf('{', j);
        break;
      }
    }
  }
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) {
      return src.slice(0, m.index) + `/* ${what}: removed when vendoring (see tools/vendor-laya-ts.mjs) */` + src.slice(j + 1);
    }
  }
  throw new Error(`unbalanced: ${what}`);
}

/** Keep only named top-level declarations from providers.ts. */
function pick(src, names) {
  const parts = [];
  for (const n of names) {
    const re = new RegExp(`^(export )?(interface|function|async function) ${n}\\b[^\\n]*$`, 'm');
    const m = re.exec(src);
    if (!m) throw new Error(`providers.ts: ${n} not found`);
    // find the matching closing brace of this declaration
    let i = src.indexOf('{', m.index + m[0].length - 1);
    if (m[2] !== 'interface') {
      const paren = src.indexOf('(', m.index);
      let d = 0;
      for (let j = paren; j < src.length; j++) {
        if (src[j] === '(') d++;
        else if (src[j] === ')' && --d === 0) {
          i = src.indexOf('{', j);
          break;
        }
      }
    }
    let depth = 0;
    for (let j = i; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}' && --depth === 0) {
        parts.push(src.slice(m.index, j + 1));
        break;
      }
    }
  }
  return parts.join('\n\n');
}

const header = (file) =>
  `// Vendored from laya-ts (https://github.com/NandhaKishorM/laya/tree/${COMMIT}/laya-ts/src/${file}.ts)\n` +
  `// Copyright Convai Innovations. Apache License 2.0 (see ../LICENSE). Patched only as described\n` +
  `// in tools/vendor-laya-ts.mjs. Do not edit by hand; re-run the script.\n/* eslint-disable */\n// @ts-nocheck\n`;

fs.mkdirSync(OUT, { recursive: true });
for (const f of FILES) {
  let src = await get(`laya-ts/src/${f}.ts`);
  src = src.replace(/from "(\.\/[\w-]+)\.js"/g, 'from "$1"');
  if (f === 'agent') src = cut(src, /^\s+static async load\(/m, 'Agent.load');
  if (f === 'tokenizer') src = cut(src, /^\/\*\* Load an HF tokenizer\.json[^\n]*\n(export )?async function loadTokenizerJson\(/m, 'loadTokenizerJson');
  fs.writeFileSync(path.join(OUT, `${f}.ts`), header(f) + src);
}
const providers = await get('laya-ts/src/providers.ts');
fs.writeFileSync(
  path.join(OUT, 'providers.ts'),
  header('providers') + pick(providers, ['Batch', 'SessionProvider', 'toNested', 'i64', 'feed', 'feedHead']) + '\n',
);
fs.writeFileSync(path.resolve('packages/laya-ts/LICENSE'), await get('LICENSE'));
console.log(`laya-ts @ ${COMMIT.slice(0, 7)} -> ${OUT}`);
