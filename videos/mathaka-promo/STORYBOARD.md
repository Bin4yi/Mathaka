# Mathaka — promo + technical explainer (storyboard: no, dispatch record only)

This video tells DEV challenge judges and caring families that **a reminder is not remembering — Mathaka answers
"Did I take it?" with open AI that never leaves the family's phones.**

Rhythm: `hush-HOOK-claim · product-demo-demo-access-family · BLOOM(breakthrough) · tech-tech-tech-tech-tech-tech · PROOF · hold-CLOSE`
Transitions: blur crossfade 0.6s primary (calm), a teal light bloom into the breakthrough, slow crossfade to close.
Audio: Kokoro `af_heart` narration per frame (assets/voice/sNN.wav); MusicGen bed in three moods (intimate → tech → uplift), carved under the voice.
Design truth: `frame.md` (Mathaka Soft Glass).

## Frame 1
status: outline
src: compositions/s01-hook.html
cite: rules waterfall-entry + depth-of-field-blur + sine-wave-loop
beat: Real photo (palm full of white pills, Commons PD) fills frame, slow push; the question "Did I take my medicine already?" types onto a frosted glass card; clock "8:00" in Plex Mono at the edge.

## Frame 2
status: outline
src: compositions/s02-claim.html
cite: blueprint kinetic-type-beats (rules waterfall-entry, spring-pop-entrance)
beat: "Alarm apps say WHEN." vs "Mathaka knows WHETHER." on two neumorphic plates; then "A reminder is not remembering." in big Fraunces; double-dose stamp.

## Frame 3
status: outline
src: compositions/s03-intro.html
cite: blueprint logo-assemble-lockup (rules spring-pop-entrance, svg-path-draw) + split-tilt-cards
beat: Logo + "Mathaka · මතකය"; two raised phones split-tilt in: elder (si home) and family dashboard; role labels on glass.

## Frame 4
status: outline
src: compositions/s04-elder.html
cite: blueprint device-surface-showcase (stepwise flow) + spring-pop-entrance
beat: Elder phone hero cycles real screens: home → dose (pill picture, purpose) → "Did you swallow?" → "Thank you, Ammi. I wrote it down." Side glass callouts: "only this slot's pills", "purpose, never a drug name", "asks twice".

## Frame 5
status: outline
src: compositions/s05-answer.html
cite: device-surface-showcase + counting-dynamic-scale (none) → stat callout; spring-pop-entrance
beat: "Did I take my medicine?" → answer screen "Yes, Ammi. You took… at 8:00"; log rows on glass; double-dose guard plate "Already taken at 8:00 — no second dose" (from the 1 double dose stopped in week stats).

## Frame 6
status: outline
src: compositions/s06-access.html
cite: blueprint grid-card-assemble (rules spring-pop-entrance, waterfall-entry)
beat: Three language phones (si / ta / en) + high-contrast phone fan in; chips: 7:1 contrast, huge text, Say it again, no swipes, family voice.

## Frame 7
status: outline
src: compositions/s07-family.html
cite: device-surface-showcase (static tour, scroll) + stat-bars-and-fills
beat: Family phone scrolls dashboard (fam-1..4); glass chips: alerts, week grid, low stock, clinic date; fridge-card + real pill organizer photo.

## Frame 8
status: outline
src: compositions/s08-breakthrough.html
cite: blueprint kinetic-type-beats + ambient-glow-bloom
beat: Deep teal bloom. "Heavy AI once." / "Light AI every day." / "No cloud." Two-phone diagram silhouette preview.

## Frame 9
status: outline
src: compositions/s09-gemma.html
cite: rules svg-path-draw + ai-tracking-box (adapted to teal) + spring-pop-entrance
beat: Family phone + glass pipeline: photo → Gemma 3 4B (Q4_K_M GGUF, llama.rn, on device) → JSON schema → zod check → retry ×1 → human confirms each row. Pill imprint "500" detection box.

## Frame 10
status: outline
src: compositions/s10-vision.html
cite: rules svg-path-draw + ai-tracking-box + counting-dynamic-scale
beat: The real pipeline stages from packages/core: tilted synthetic photo → 4 ArUco markers boxed → homography warp → grey patch white balance → segmented pill → measures (19.2 × 9.2 mm, oblong, white, score line, ~200 ms). Two-tone capsule second pass.

## Frame 11
status: outline
src: compositions/s11-file.html
cite: rules spring-pop-entrance + svg-path-draw
beat: Approve screen (real) → `mathaka-calibration-v1.mtk` zip opens: manifest.json (SHA-256 per file), data.json, photos/, voice/. Travel line family→elder; reject list: broken · changed · older · unapproved.

## Frame 12
status: outline
src: compositions/s12-laya.html
cite: rules svg-path-draw + waterfall-entry
beat: "mama beheth biwwada?" → Laya (non-generative) picks one of < 20 options + probability → template table (si/ta/en) → elder screen. A wall: "No model writes words for Ammi."

## Frame 13
status: outline
src: compositions/s13-alerts.html
cite: rules svg-path-draw + spring-pop-entrance
beat: Elder phone → family phone: 1 Wi-Fi (TCP :8790, QR pairing) ✓, 2 SMS (SmsManager, no data), 3 pending → retry every ≥15 min (expo-background-task).

## Frame 14
status: outline
src: compositions/s14-arduino.html
cite: rules spring-pop-entrance + sine-wave-loop (LED blink, finite)
beat: Real ESP32 photo (Commons) + neumorphic 4-slot box with LEDs lighting morning, blink ≤1 Hz; protocol lines in mono (LIGHT 1 / PRESS 1 / LID 2 OPEN); "The box never decides."

## Frame 15
status: outline
src: compositions/s15-proof.html
cite: blueprint dataviz-countup (rules counting-dynamic-scale, stat-bars-and-fills, depth-of-field-blur)
beat: 40/40 · 4/4 · 0 unsafe; pills 100% vs 62% colour-only bars; Laya 25% wrong-action → "stays off — buttons are 0% wrong by design".

## Frame 16
status: outline
src: compositions/s16-close.html
cite: blueprint logo-assemble-lockup (rules spring-pop-entrance) + titlecard-reveal
beat: Three generations photo (Commons) soft; "A reminder is not remembering." → "Mathaka remembers." logo lockup; Gemma · Arduino · open source; "Not a medical device"; credits line.
