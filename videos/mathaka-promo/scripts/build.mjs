// Builds index.html (all 16 scenes) from data + real voice durations.
// Run from videos/mathaka-promo: node scripts/build.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const dur = (f) => {
  try { return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim()); } catch { return 0; }
};
const ph = (imgs, cls = '') => `<div class="phone ${cls}"><div class="screen">${imgs.map((s) => `<img src="assets/app/${s}.png" alt="">`).join('')}</div></div>`;
const chips = (list) => list.map((c) => `<div class="chip glass"><span class="dot" style="background:${c[1] ?? 'var(--teal)'}"></span>${c[0]}</div>`).join('');
const flow = (nodes) => nodes.map((n, i) => `${i ? '<div class="arrow">→</div>' : ''}<div class="node ${n[2] ?? 'glass'}">${n[0]}<small>${n[1]}</small></div>`).join('');

const S = [
  { id: 's01', lead: 1.2, tail: 1.2, html: `
    <img class="photo full kb" src="assets/photos/pills.jpg" alt="">
    <div class="shade"></div>
    <div class="glass qcard"><div class="kicker">8:00 · morning</div><div class="display q" data-type="Did I take my medicine already?"></div></div>` },
  { id: 's02', html: `
    <div class="ghost" style="left:-60px;top:40px;font-size:420px">whether</div>
    <div class="row2">
      <div class="neu plate"><div class="kicker" style="color:var(--ink-soft)">Alarm apps</div><div class="display big">say <em style="color:var(--ink-soft)">when.</em></div></div>
      <div class="neu plate teal-fill"><div class="kicker" style="color:#bfe7df">Mathaka</div><div class="display big" style="color:#fff">knows <em style="color:var(--morning)">whether.</em></div></div>
    </div>
    <div class="display huge center-line">A reminder is not remembering.</div>` },
  { id: 's03', html: `
    <div class="brand"><img src="assets/app/logo.png" alt=""><div><div class="display" style="font-size:120px">Mathaka</div><div class="si" style="font-size:54px;color:var(--teal)">මතකය · memory</div></div></div>
    ${ph(['si-home'], 'p-left')}${ph(['fam-1'], 'p-right')}
    <div class="glass tag t-left"><b>Elder phone</b><small>old, cheap Android · 3–4 GB</small></div>
    <div class="glass tag t-right"><b>Family / Memory Buddy</b><small>son · daughter · pharmacist</small></div>` },
  { id: 's04', html: `
    ${ph(['en-home', 'en-dose', 'en-confirm', 'en-taken'], 'p-hero seq')}
    <div class="side"><div class="kicker">The elder phone</div><div class="display mid">One gentle step at a time.</div>
    <div class="chipcol">${chips([['Only this slot\'s pills'], ['Purpose, never a drug name', 'var(--morning)'], ['"Did you swallow them now?"', 'var(--noon)'], ['Written to the log', 'var(--evening)']])}</div></div>` },
  { id: 's05', html: `
    ${ph(['en-home-after', 'en-ask-after'], 'p-hero seq')}
    <div class="side"><div class="kicker">"Did I take my medicine?"</div><div class="display mid">Answered from the log. Same calm words, every time.</div>
    <div class="neu guard"><div class="mono" style="color:var(--alert);font-size:24px;font-weight:700">DOUBLE-DOSE GUARD</div><div style="font-size:36px;font-weight:800;margin-top:10px">Already taken at 8:00.<br>No second dose is logged.</div></div></div>` },
  { id: 's06', html: `
    <div class="fan">${ph(['si-home'], 'f1')}${ph(['ta-home'], 'f2')}${ph(['en-home'], 'f3')}${ph(['hc-home'], 'f4')}</div>
    <div class="bottomchips">${chips([['සිංහල · தமிழ் · English'], ['7:1 contrast', 'var(--night)'], ['Huge text', 'var(--morning)'], ['"Say it again"', 'var(--noon)'], ['No swipes, no double taps', 'var(--evening)'], ['Family voice', 'var(--teal)']])}</div>` },
  { id: 's07', html: `
    ${ph(['fam-1', 'fam-2', 'fam-3', 'fam-4'], 'p-hero seq')}
    <div class="side"><div class="kicker">The family phone</div><div class="display mid">The whole day, at a glance.</div>
    <div class="chipcol">${chips([['Doses taken today'], ['Missed-dose alerts', 'var(--alert)'], ['Low stock · refill', 'var(--noon)'], ['Clinic date reminder', 'var(--evening)'], ['Fridge card on paper', 'var(--morning)']])}</div></div>
    <img class="photo card-photo" src="assets/photos/organizer.jpg" alt="">` },
  { id: 's08', tail: 1.6, dark: true, html: `
    <div class="bloomcore"></div>
    <div class="stack"><div class="display giant w1">Heavy AI, <em>once.</em></div><div class="display giant w2">Light AI, <em>every day.</em></div><div class="kicker w3" style="color:#bfe7df;font-size:34px">No cloud. Anywhere.</div></div>` },
  { id: 's09', html: `
    <div class="kicker top">1 · Setup, on the family phone</div>
    <div class="display mid top2">Gemma 3 reads the prescription. A person confirms every row.</div>
    <div class="flow">${flow([['Prescription photo', 'clinic book · handwriting'], ['Gemma 3 4B vision', 'Q4_K_M GGUF · llama.rn · on device', 'teal-fill'], ['JSON schema', 'zod check · retry once'], ['Human confirms', 'row by row · nothing used before']])}</div>
    <div class="flow f2">${flow([['Pill imprint', '"500" read from the photo'], ['Plain description', 'for the family'], ['Weekly summary', 'counted facts only']])}</div>` },
  { id: 's10', html: `
    <div class="kicker top">2 · Pill vision in plain TypeScript</div>
    <div class="display mid top2">Measured, not guessed.</div>
    <div class="vis">
      <div class="vstep"><img src="assets/vision/sugar-photo.png" alt=""><span class="mono">photo · 4 ArUco markers</span></div>
      <div class="arrow">→</div>
      <div class="vstep"><img src="assets/vision/sugar-warp.png" alt=""><span class="mono">homography · 4 px/mm</span></div>
      <div class="arrow">→</div>
      <div class="vstep"><img src="assets/vision/sugar-view.png" alt=""><span class="mono">grey-patch balance · segment</span></div>
    </div>
    <div class="readout glass"><div class="mono k">oblong · white · score line</div><div class="display num"><span data-count="19.2">0</span> × <span data-count="9.2">0</span> mm</div><div class="mono k">~200 ms · same code on phone, browser, tests</div></div>` },
  { id: 's11', html: `
    ${ph(['buddy-approve'], 'p-left2')}
    <div class="side wide"><div class="kicker">3 · One file, checked twice</div><div class="display mid">A second person approves. Then one file travels.</div>
    <div class="glass file"><div class="mono fn">mathaka-calibration-v1.mtk</div>
      <div class="mono ln">manifest.json  <b>SHA-256 per file</b></div><div class="mono ln">data.json      elder · medicines · schedule</div><div class="mono ln">photos/ · voice/</div></div>
    <div class="chipcol row">${chips([['Bluetooth'], ['USB cable'], ['WhatsApp to yourself']])}</div>
    <div class="reject mono">rejects: broken · changed · older · unapproved</div></div>` },
  { id: 's12', html: `
    <div class="kicker top">4 · The AI that is not allowed to speak</div>
    <div class="flow">${flow([['"mama beheth biwwada?"', 'Singlish, spoken'], ['Laya', 'non-generative · picks 1 of &lt;20', 'teal-fill'], ['intent = did_i_take', 'only if p ≥ 0.85 · else ask family'], ['Fixed template', 'si · ta · en · facts from the log']])}</div>
    <div class="display mid wall">No model ever writes words for Ammi.</div>` },
  { id: 's13', html: `
    <div class="kicker top">5 · Alerts without a cloud</div>
    <div class="display mid top2">When a dose is missed, the family knows.</div>
    <div class="lanes">
      <div class="neu lane"><div class="n">1</div><div><b>Home Wi-Fi</b><small class="mono">TCP :8790 · paired once by QR</small></div></div>
      <div class="neu lane"><div class="n">2</div><div><b>Plain SMS</b><small class="mono">SmsManager · no mobile data</small></div></div>
      <div class="neu lane"><div class="n">3</div><div><b>Retry</b><small class="mono">pending → background task ≥15 min</small></div></div>
    </div>` },
  { id: 's14', html: `
    <img class="photo esp" src="assets/photos/esp32.jpg" alt="">
    <div class="side wide2"><div class="kicker">6 · Arduino pill box (optional)</div><div class="display mid">The lit slot is due. Press it: "I took it".</div>
    <div class="box neu">${['morning', 'noon', 'evening', 'night'].map((s, i) => `<div class="slot"><div class="led l${i}" style="background:var(--${s})"></div><span>${s}</span></div>`).join('')}</div>
    <div class="glass proto mono">→ LIGHT 1 &nbsp;&nbsp;← PRESS 1 &nbsp;&nbsp;← LID 2 OPEN<br>BLE + USB serial · Wokwi simulator</div>
    <div class="caption" style="margin-top:20px"><b>The box never decides.</b> Same double-dose guard.</div></div>` },
  { id: 's15', html: `
    <div class="kicker top">Frozen test sets · eval/report.md</div>
    <div class="stats">
      <div class="neu stat"><div class="display num"><span data-count="40">0</span>/40</div><div>"Did I take it?" answers</div></div>
      <div class="neu stat"><div class="display num"><span data-count="4">0</span>/4</div><div>double doses stopped</div></div>
      <div class="neu stat"><div class="display num">0</div><div>unsafe sentences</div></div>
    </div>
    <div class="bars glass">
      <div class="bar"><span>Pill matching (attributes)</span><div class="track"><i style="--w:1"></i></div><b>100%</b></div>
      <div class="bar"><span>Colour only (baseline)</span><div class="track"><i style="--w:.62"></i></div><b>62%</b></div>
      <div class="bar"><span>Laya zero-shot, wrong actions</span><div class="track"><i class="bad" style="--w:.25"></i></div><b>25%</b></div>
    </div>
    <div class="display small-note">So Laya stays off. Ammi keeps her big buttons.</div>` },
  { id: 's16', tail: 4.5, html: `
    <img class="photo full soft" src="assets/photos/generations.jpg" alt="">
    <div class="veil"></div>
    <div class="close"><img src="assets/app/logo.png" alt=""><div class="display giant2">Mathaka <em>remembers.</em></div>
    <div class="chipcol row">${chips([['Gemma 3 · on device'], ['Arduino · ESP32', 'var(--noon)'], ['Open source · Apache-2.0', 'var(--evening)']])}</div>
    <div class="mono fine">Not a medical device. It does not replace a carer. · Photos: Wikimedia Commons (Ayena PD, Stevepb CC0, trokilinochchi CC BY 2.0, Edwiyanto CC BY-SA 4.0)</div></div>` },
];

const XF = 0.6;
let t = 0;
const clips = [];
const voices = [];
for (const s of S) {
  const v = dur(`assets/voice/${s.id}.wav`) || 10;
  const lead = s.lead ?? 0.6;
  const d = +(lead + v + (s.tail ?? 0.9)).toFixed(2);
  s.start = +t.toFixed(2); s.dur = d; s.v = v; s.lead = lead;
  if (fs.existsSync(`assets/voice/${s.id}.wav`)) voices.push(`<audio id="vo-${s.id}" src="assets/voice/${s.id}.wav" data-start="${(s.start + lead).toFixed(2)}" data-duration="${v.toFixed(2)}" data-track-index="10" data-volume="1"></audio>`);
  t += d - XF;
}
const total = +(t + XF).toFixed(2);
const music = fs.existsSync('assets/music/bed.wav') ? `<audio id="bgm" src="assets/music/bed.wav" data-start="0" data-duration="${total}" data-track-index="11" data-volume="0.16"></audio>` : '';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<link rel="stylesheet" href="shared.css" />
<link rel="stylesheet" href="scenes.css" />

<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1920px; height: 1080px; overflow: hidden; background: #edf1f5; }
  #root { position: relative; width: 100%; height: 100%; overflow: hidden; }
  #root > section { position: absolute; inset: 0; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
${S.map((s, i) => `<section id="${s.id}" class="clip" data-start="${s.start}" data-duration="${s.dur}" data-track-index="${i % 2}"><div class="scene ${s.dark ? 'dark' : ''}" id="${s.id}-scene"><div class="bloom teal" style="width:1100px;height:1100px;left:-300px;top:-420px"></div><div class="bloom amber" style="width:900px;height:900px;right:-260px;bottom:-380px"></div><div class="grain"></div>${s.html}</div></section>`).join('\n')}
${voices.join('\n')}
${music}
</div>
<script>
  const tl = gsap.timeline({ paused: true });
  const S = ${JSON.stringify(S.map(({ id, start, dur, v, lead }) => ({ id, start, dur, v, lead })))};
  S.forEach((s, i) => {
    const el = document.getElementById(s.id + '-scene');
    const T = s.start, L = T + s.lead;
    const q = (sel) => Array.from(el.querySelectorAll(sel));
    if (i) tl.fromTo(el, { opacity: 0, filter: 'blur(14px)' }, { opacity: 1, filter: 'blur(0px)', duration: ${XF}, ease: 'sine.out' }, T);
    q('.bloom').forEach((b, k) => tl.fromTo(b, { x: 0, y: 0, scale: 1 }, { x: k ? -90 : 90, y: k ? 50 : -50, scale: 1.12, duration: s.dur, ease: 'sine.inOut' }, T));
    q('.ghost').forEach((g) => tl.fromTo(g, { x: 0 }, { x: -160, duration: s.dur, ease: 'none' }, T));
    q('.kb').forEach((p) => tl.fromTo(p, { scale: 1.12 }, { scale: 1, duration: s.dur, ease: 'none' }, T));
    q('.soft').forEach((p) => tl.fromTo(p, { scale: 1.08 }, { scale: 1, duration: s.dur, ease: 'none' }, T));
    // entrances: kicker, display, glass/neu blocks, phones, chips
    const parts = q('.kicker, .display, .brand, .flow, .vis, .readout, .lanes, .stats, .bars, .box, .proto, .file, .guard, .fan, .bottomchips, .close, .tag, .card-photo, .esp, .reject, .caption, .stack > *, .row2 > *, .center-line');
    parts.forEach((p, k) => tl.fromTo(p, { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, L + 0.15 + Math.min(k, 8) * Math.min(0.55, (s.v * 0.55) / Math.max(parts.length, 1))));
    q('.chip').forEach((c, k) => tl.fromTo(c, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.55, ease: 'power3.out' }, L + 1.2 + k * Math.min(0.9, (s.v * 0.6) / 6)));
    q('.phone').forEach((p, k) => tl.fromTo(p, { opacity: 0, y: 120, rotation: k % 2 ? 3 : -3 }, { opacity: 1, y: 0, rotation: 0, duration: 1.1, ease: 'power3.out' }, T + 0.2 + k * 0.15));
    q('.phone').forEach((p) => tl.fromTo(p, { yPercent: 0 }, { yPercent: -1.2, duration: s.dur, ease: 'sine.inOut' }, T + 1.3));
    // screen sequence inside the hero phone: evenly across the voice
    q('.seq .screen img').forEach((img, k, all) => {
      if (!k) return;
      tl.fromTo(img, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, L + (s.v * k) / all.length);
    });
    q('.arrow').forEach((a, k) => tl.fromTo(a, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, L + 0.8 + k * 0.7));
    q('.flow .node').forEach((n, k) => tl.fromTo(n, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, L + 0.5 + k * Math.min(2.2, s.v / 6)));
    q('.vstep').forEach((n, k) => tl.fromTo(n, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' }, L + 2 + k * 3.2));
    q('[data-count]').forEach((c) => {
      const to = Number(c.dataset.count), st = { v: 0 }, dec = to % 1 ? 1 : 0;
      tl.fromTo(st, { v: 0 }, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: () => { c.textContent = st.v.toFixed(dec); } }, L + s.v * 0.55);
    });
    q('.track i').forEach((b, k) => tl.fromTo(b, { scaleX: 0 }, { scaleX: Number(b.style.getPropertyValue('--w')), duration: 1.4, ease: 'power3.out' }, L + s.v * 0.45 + k * 1.6));
    q('.lane').forEach((n, k) => tl.fromTo(n, { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, L + 2.5 + k * 2.6));
    q('.led').forEach((d, k) => tl.fromTo(d, { opacity: 0.18, boxShadow: '0 0 0 rgba(0,0,0,0)' }, { opacity: k ? 0.18 : 1, boxShadow: k ? '0 0 0 rgba(0,0,0,0)' : '0 0 46px #f6b93b', duration: 0.5, repeat: k ? 0 : 7, yoyo: true, ease: 'sine.inOut' }, L + 2));
    q('[data-type]').forEach((e) => {
      const txt = e.dataset.type, st = { n: 0 };
      tl.fromTo(st, { n: 0 }, { n: txt.length, duration: txt.length / 16, ease: 'none', onUpdate: () => { e.textContent = txt.slice(0, Math.round(st.n)); } }, L + s.v * 0.55);
    });
    if (i === S.length - 1) tl.to(el, { opacity: 0, duration: 1.4, ease: 'power1.in' }, T + s.dur - 1.4);
  });
  window.__timelines["main"] = tl;
</script>
</body>
</html>
`;
fs.writeFileSync('index.html', html);
console.log('scenes', S.map((s) => `${s.id}@${s.start}+${s.dur}`).join(' '), '\ntotal', total, 's');
