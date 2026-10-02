#!/usr/bin/env node
/**
 * Screenshots of the web build with headless Chrome (no Android needed).
 *
 *   cd apps/mobile && npx expo export --platform web --output-dir ../../.tmp-web
 *   node tools/web-shots.mjs --dir .tmp-web --out docs/screenshots elder@/elder?demoTime=08:10 family@/family
 *
 * Each target is name@path. Chrome's headless window is at least 500 px wide, so we
 * use 500 x 1000 (close to a big phone in portrait).
 * Set CHROME=path/to/chrome if Chrome is not in the usual place.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const dir = path.resolve(opt('--dir', '.tmp-web'));
const out = path.resolve(opt('--out', 'docs/screenshots'));
const width = Number(opt('--width', '500'));
const height = Number(opt('--height', '1000'));
const wait = Number(opt('--wait', '8000'));
const targets = args.map((a) => {
  const [name, url] = a.split('@');
  return { name, url };
});

const CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chrome = CANDIDATES.find((c) => fs.existsSync(c));
if (!chrome) throw new Error('Chrome not found. Set CHROME=/path/to/chrome');
if (!fs.existsSync(path.join(dir, 'index.html'))) throw new Error(`No web build in ${dir}`);

const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.json': 'application/json' };
const server = http
  .createServer((req, res) => {
    let p = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(dir, 'index.html'); // SPA fallback
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] ?? 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  })
  .listen(0);
const port = server.address().port;

fs.mkdirSync(out, { recursive: true });
for (const t of targets) {
  const file = path.join(out, `${t.name}.png`);
  // async: the same process serves the files, so it must not block
  await promisify(execFile)(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${width},${height}`,
    `--virtual-time-budget=${wait}`, `--screenshot=${file}`, `http://localhost:${port}${t.url}`,
  ]);
  console.log(`${t.name}: ${file}`);
}
server.close();
