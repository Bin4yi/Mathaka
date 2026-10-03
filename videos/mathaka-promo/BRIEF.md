---
workflow: general-video
flow: automation
storyboard: no
message: "A reminder is not remembering — Mathaka answers 'Did I take it?' with open AI that never leaves the family's phones"
destination: youtube
aspect: 1920x1080
language: en
audience: DEV challenge judges and developers; families caring for elders
length: 3-5min
angle: apple-level promo + technical explainer
---

## Intent

Binula asked: "using /hyperframes create a 3–5 mins complete demo video for this app. use real images from internet to test. make it apple level promo video. explain the full technical breakthrough of this app. use diagrams and real footage also. include all the features in this app. also for style of the video use Neumorphism and Glassmorphism."

Calm, warm, premium (Apple keynote pacing): big type, soft light, one idea per beat. Story: the problem (memory loss: "did I take it?") → the product (elder + family) → the technical breakthrough (heavy AI once, light AI every day; Gemma sees, Laya decides but cannot speak, templates speak) → proof (eval numbers, honest limits) → close (open source, built for Ammi).

## Assets

- ../../apps/mobile (web build) — real app footage: screen captures of elder home, dose, answer, family dashboard, calibration, voice, more/fridge card (tools/web-shots.mjs; Sinhala + English).
- ../../apps/mobile/assets/generated — logo, icons, pill library, pill box illustrations.
- ../../apps/mobile/assets/mat/calibration-mat.png — the printed calibration mat.
- ../../eval/report.md — the numbers (40/40, 4/4 double doses, 0 unsafe; pills 100%/100% vs 62%/92%; Laya gate).
- ../../firmware/esp32 — Arduino pill box (diagram.json, protocol).
- Internet images: openly licensed only (Wikimedia Commons / CC0), with attribution in the credits.

## Customizations

- AI voiceover in English (calm, warm) — offline Kokoro voice (user is signed out of HeyGen; offline engines ready).
- Soft music bed — offline MusicGen, carved under the voice.
- Neumorphism + Glassmorphism design language matching the app redesign (off-white #EDF1F5, teal gradient #176358→#0E463F, slot colours).
- Technical diagrams: two-phone architecture + .mtk file sync, pill vision pipeline, decision layer vs templates, alerts Wi-Fi/SMS, Arduino ESP32 box.

## Notes

- Honest: not a medical device; pill numbers are synthetic; Laya not default yet. No fabricated claims.
- Sponsor categories to show: Gemma (on-device) and Arduino (ESP32 box).
- Deadline: DEV challenge closes 2026-10-05 06:59 UTC.
