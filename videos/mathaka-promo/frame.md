---
name: Mathaka Soft Glass
colors:
  canvas: "#EDF1F5"        # app background, off-white tinted toward teal
  canvas-deep: "#DDE5EC"   # lower stop of the canvas gradient
  ink: "#16222B"           # all body text (14:1 on canvas)
  ink-soft: "#4A5965"      # secondary text (6.6:1 on canvas)
  teal: "#176358"          # the one accent; app primary gradient start
  teal-deep: "#0E463F"     # app primary gradient end, focal fills
  on-teal: "#F4FBF9"
  glass: "rgba(255,255,255,0.46)"
  glass-edge: "rgba(255,255,255,0.85)"
  neu-light: "rgba(255,255,255,0.95)"
  neu-dark: "rgba(163,177,198,0.62)"
  slot-morning: "#F6B93B"
  slot-noon: "#F28C38"
  slot-evening: "#9B6FB6"
  slot-night: "#3C4A7A"
  alert: "#C2410C"
typography:
  display:
    fontFamily: Fraunces
    fontWeight: 600
    fontSize: 96-150px
    letterSpacing: -0.035em
    role: the human voice — statements, the question, the promise
  body:
    fontFamily: Manrope
    fontWeight: 500 / 800
    fontSize: 30-44px
    role: explanation, labels on diagrams
  data:
    fontFamily: IBM Plex Mono
    fontWeight: 400 / 700
    fontSize: 20-28px
    role: the machine voice — file names, numbers, timings, protocol lines
  script:
    fontFamily: Noto Sans Sinhala / Noto Sans Tamil (bold)
rounded:
  card: 44px
  pill: 999px
  phone: 64px
depth:
  neu-raised: "18px 18px 40px neu-dark, -18px -18px 40px neu-light"
  neu-inset: "inset 10px 10px 22px neu-dark, inset -10px -10px 22px neu-light"
  glass: "backdrop-filter blur(24px) saturate(1.4); 2px glass-edge border; soft drop 0 30px 80px rgba(22,34,43,0.18)"
motion:
  energy: calm
  easing:
    entry: "power3.out / expo.out"
    exit: "power2.in"
    ambient: "sine.inOut"
  entrance: 0.6-1.0s
  transition: blur crossfade 0.6s (scene to scene), one sdf-style light bloom at the breakthrough
---

## Overview

Mathaka Soft Glass is the app's own redesign blown up to cinema scale: an off-white, teal-tinted canvas
lit from the top-left, raised neumorphic objects that look pressed out of the same material, and frosted
glass panels floating above them for anything the machine says. Apple-keynote pacing: one idea per beat,
huge type, long calm holds, slow drift on everything.

**Concept angle:** *Two voices.* The human voice (Ammi, the family) is warm Fraunces serif on soft raised
neumorphic surfaces. The machine voice (Gemma, the vision pipeline, the protocols) is IBM Plex Mono on
cool frosted glass. The breakthrough is that the machine voice never reaches Ammi — so on screen, mono text
never appears inside the elder's phone, only around it.

## Colors

One accent: teal. Slot colours (morning amber, noon orange, evening violet, night indigo) appear only as
the four-slot motif (pill box, slot strip, LED box). Alert orange only for missed-dose / rejected states.
No pure black, no pure white canvas, no neon, no gradient text.

## Elevation

- Canvas: radial teal and amber blooms at 18-25% opacity drifting slowly, plus faint grain.
- Raised (neumorphic): phones, the pill box, stat tiles. Dual shadow from top-left light.
- Inset (neumorphic): wells that hold numbers, the mat disc, toggles.
- Glass: diagram nodes, captions, code/protocol callouts. Always above raised objects.

## Do's and Don'ts

- Do keep real app screenshots untouched inside a raised phone frame.
- Do label every diagram with the real names (llama.rn, js-aruco2, SHA-256, SmsManager, BLE UUID).
- Don't invent numbers: every figure comes from eval/report.md or assets/vision/analysis.json.
- Don't show any drug-name text in elder-phone moments (the app never does).
- Don't use dark full-screen gradients; light canvas throughout, one deep-teal moment at the breakthrough.
