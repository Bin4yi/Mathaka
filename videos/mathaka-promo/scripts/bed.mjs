// Joins the MusicGen sections (a → b → c, whichever exist) with crossfades until the bed covers the video.
// Run: node scripts/bed.mjs <seconds>
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const total = Number(process.argv[2] ?? 240);
const parts = ['a-intimate', 'b-tech', 'c-uplift'].map((n) => `assets/music/${n}.wav`).filter((f) => fs.existsSync(f));
if (!parts.length) throw new Error('no music sections yet');
const seq = [];
while (seq.length * 24 < total + 6) seq.push(parts[Math.min(parts.length - 1, Math.floor((seq.length / Math.ceil((total + 6) / 24)) * parts.length))]);
const args = ['-v', 'error', '-y'];
seq.forEach((f) => args.push('-i', f));
let chain = '', last = '[0:a]';
for (let i = 1; i < seq.length; i++) {
  chain += `${last}[${i}:a]acrossfade=d=4:c1=tri:c2=tri[x${i}];`;
  last = `[x${i}]`;
}
chain += `${last}atrim=0:${total},afade=t=in:d=3,afade=t=out:st=${total - 6}:d=6,loudnorm=I=-20[out]`;
args.push('-filter_complex', chain, '-map', '[out]', '-ar', '44100', 'assets/music/bed.wav');
execFileSync('ffmpeg', args, { stdio: 'inherit' });
console.log('bed', seq.length, 'segments from', parts.join(', '));
