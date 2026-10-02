#!/usr/bin/env node
/**
 * Makes the reminder sound: a soft, LOW chime (all tones 400–1000 Hz).
 * Many older people lose high frequencies first, so we avoid high beeps.
 * Pure Node, no dependencies. Same output every run.
 *
 *   node tools/make-chime.mjs   -> apps/mobile/assets/sounds/chime_low.wav
 */
import fs from 'node:fs';
import path from 'node:path';

const RATE = 22050;
// Three gentle notes going down (A5 is too high; we stay in the 440–660 Hz range).
const NOTES = [
  { f: 659.3, start: 0.0, dur: 1.1 }, // E5
  { f: 554.4, start: 0.45, dur: 1.1 }, // C#5
  { f: 440.0, start: 0.9, dur: 1.6 }, // A4
];
const LENGTH = 2.6; // seconds
const VOLUME = 0.55;

const n = Math.round(LENGTH * RATE);
const samples = new Float32Array(n);
for (const note of NOTES) {
  const s0 = Math.round(note.start * RATE);
  const len = Math.round(note.dur * RATE);
  for (let i = 0; i < len && s0 + i < n; i++) {
    const t = i / RATE;
    // soft attack (30 ms), slow exponential decay: a bell, not a beep
    const env = Math.min(1, t / 0.03) * Math.exp(-3 * t);
    // fundamental + a quiet 2nd harmonic, only when it stays under 1000 Hz
    const partial = note.f * 2 <= 1000 ? 0.15 * Math.sin(2 * Math.PI * note.f * 2 * t) : 0;
    samples[s0 + i] += env * (Math.sin(2 * Math.PI * note.f * t) + partial);
  }
}
let peak = 0;
for (const v of samples) peak = Math.max(peak, Math.abs(v));

const data = Buffer.alloc(n * 2);
for (let i = 0; i < n; i++) data.writeInt16LE(Math.round((samples[i] / peak) * VOLUME * 32767), i * 2);

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // PCM chunk size
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

const out = path.resolve('apps/mobile/assets/sounds/chime_low.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([header, data]));
console.log(`chime: ${out} (${(n / RATE).toFixed(1)} s, tones ${NOTES.map((x) => Math.round(x.f)).join('/')} Hz)`);
