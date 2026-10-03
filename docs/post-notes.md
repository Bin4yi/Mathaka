---
title: Mathaka — a medicine helper for my Ammi, with open AI that runs on her old phone
published: false
tags: devchallenge, weekendchallenge, hf26challenge
---

*This is a submission for the [Hacktoberfest Weekend Challenge: Build for a Friend](https://dev.to/challenges/hacktoberfest-weekend-2026-10-01)*

<!-- DRAFT for Binula. Replace every [YOU: ...] with your own words. Keep it honest and short.
     Screenshots to add: see the list at the bottom of this file. -->

## What I Built

> **A reminder is not remembering.**

[YOU: 2–3 sentences about the real person. For example: "My Ammi is 78. She takes four medicines a day. Since her memory started to slip, the hardest question in our house is not *when* to take them. It is *did I already take them?* She asks it five times a morning, and sometimes she takes the sugar tablet twice."]

Alarm apps only say **when**. People with memory loss also need to know **whether** they already took the medicine. So I built **Mathaka** (මතකය, "memory" in Sinhala), a dementia-friendly medicine helper for Android, made for older people in Sri Lanka.

- **One big button: "Did I take my medicine?"** The app answers from its own log, kindly, in the same words every time: *"Yes, Ammi. You took your morning medicine at 8:05. The next one is at lunch time."*
- **A double-dose guard.** If she presses "I took it" again, the app does not log a second dose. It gently tells her she already took it.
- **Only the pills for now.** The screen shows big, simple pictures of exactly this slot's pills, with their purpose ("sugar medicine"), never a drug name.
- **The family knows.** Missed doses, unclear answers, a pill that "looks new", low stock and clinic dates go to the family. This works over home Wi-Fi or by plain SMS, with no internet needed.
- **Sinhala, Tamil and English**, with huge text, a 7:1 contrast rule, voice, and a family member's own recorded voice.
- **An optional Arduino pill box** that lights the slot that is due now.

Everything runs **on the phones**. There is no cloud, no account and no monthly bill. Ammi's phone can be an old, cheap Android.

## Demo

[YOU: embed the YouTube video here: `{% embed https://youtu.be/... %}`]

- The 4-minute video shows the elder flow, calibration, the AI, the Arduino box and the evaluation.
- APK (preview build): [YOU: EAS link]
- **Try the box with no hardware:** [Wokwi simulation](https://wokwi.com/projects/new/esp32). Paste `firmware/esp32/mathaka_box/mathaka_box.ino` and `diagram.json`, then type `LIGHT 1` in the serial monitor.

## Code

{% embed https://github.com/[YOU]/mathaka %}

It is an Expo / React Native app with a pure-TypeScript core package, an Arduino sketch, an optional Python laptop helper, and an evaluation suite with frozen test sets. It has 124 automated tests (app 59, core 52, helper 10, eval 3).

## How I Built It

The design rule is **heavy AI once, light AI every day**. Mathaka has two phones and three kinds of open AI.

**1. The family phone calibrates once, with Gemma (open weights, on device).**
- A pharmacist or a family member with a good memory (the *Memory Buddy*) photographs the prescription. **Gemma 3 4B (vision, Q4_K_M GGUF)** runs on the phone through [llama.rn](https://github.com/mybigday/llama.rn) (llama.cpp) and reads it into rows.
- Every call is forced into a **JSON schema**, checked with zod, and retried once; if it still fails, the app says so clearly.
- Clinic books are handwritten, so **every row must be confirmed by a person**. Nothing the model reads is used until a human says "this row is correct".
- Gemma also reads the **imprint** on each pill ("500") and writes a short plain description for the family.
- On a weaker phone, the same contracts run on a laptop on the home Wi-Fi (FastAPI + Ollama).

**2. The pill itself is measured with plain TypeScript, not a big model.**
- Each pill is placed on a printed **calibration mat** with 4 ArUco markers, a 50% grey patch and a dark placement disc.
- A pure-TypeScript pipeline finds the markers, fixes perspective, converts pixels to millimetres, white-balances on the grey patch, segments the pill, and measures **size, shape, colour (Lab), two-tone halves and the score line**.
- It runs the same code on the phone, in the browser and in the evaluation.
- The app then draws a big, simple picture of the pill and asks the Memory Buddy one question: *"Does the picture look like the real pill?"*
- A **second person** must approve the whole calibration before it can be sent to the elder's phone.

**3. The elder phone gets one file and uses only light AI.**
- The calibration travels as one `.mtk` file (a zip with a SHA-256 for every file) by Bluetooth, USB or WhatsApp-to-yourself.
- The elder phone rejects broken, changed, older or unapproved files.
- On that phone, the "AI" is the pill check and the decision layer below. Gemma is **never** loaded there.

**4. The decision layer is "the AI that is not allowed to speak".**
- Some things need understanding: what did Ammi *mean* by *"mama beheth biwwada?"* (Singlish for "did I take my medicine?").
- For that I use **[Laya](https://huggingface.co/convaiinnovations/laya)**, an open, *non-generative* decision model. It can only pick one option from a short list and give a calibrated probability. **It cannot write a sentence.**
- **Every word the elder hears comes from a fixed template**, filled only with data from the local log. No model ever writes text for her, and no answer ever says "take another one".
- I evaluated Laya honestly before trusting it (results below).

**5. The Arduino pill box (optional).**
- An ESP32 with 4 LEDs and 4 buttons (or reed switches in the lids) runs a small Arduino sketch.
- The phone lights the slot that is due, and blinks it gently (max 1 Hz) when the dose is late. Pressing the lit slot counts as "I took it", with the same double-dose guard.
- Opening any other slot changes nothing for Ammi, but quietly tells the family.

### What the numbers say

| Test (frozen, hash-checked) | Result |
|---|---|
| "Did I take it?" answers, 40 hand-written cases | **40/40** |
| Double doses stopped | **4/4** |
| Unsafe elder sentences ("take another", doses) | **0** |
| Pill matching, attributes (36 synthetic photos) | **100%** known pills, **100%** new pills rejected |
| Pill matching, colour-only baseline | 62% / 92% |

**Laya, zero-shot, on a Sinhala/Singlish dev set.** At the 0.85 threshold, the multilingual checkpoint gets **48%** right and acts wrongly **25%** of the time. The English checkpoint gets 100% on English, but only 25% on Sinhala script and Singlish.

So **Laya is not the default yet**. The elder phone keeps big buttons, which are 0% wrong by design, and I prepared a Kaggle fine-tune on Sinhala care phrases written by my family. I would rather ship buttons than a confident wrong answer to a person with dementia.

[YOU: if you finish the fine-tune before the deadline, add the new row here.]

## Why Does Open Innovation Matter?

- **Privacy that is real, not promised.** Ammi's medicine photos, her log and her son's recorded voice never leave the two phones. With open weights I can *check* that, instead of trusting a privacy policy.
- **It works in a village.** Calibration needs one model download on Wi-Fi; after that everything runs offline. Alerts go by plain SMS. A closed API would stop working when the signal does.
- **No monthly bill for a pensioner.** Inference costs nothing per call, and it runs on an old phone.
- **I could change the parts that matter for us:**
  - Sinhala and Tamil templates
  - an elder-first interface
  - a pill pipeline tuned to Sri Lankan clinic envelopes, which often have no label at all
  - a model I can **fine-tune for Singlish and give back** to the community
- **The right tool for a vulnerable person.** A model that *cannot generate text* is the safest way to make decisions about someone with dementia. Because the weights are open, I could measure exactly how often it would act wrongly. That measurement is why it is not switched on yet.

## My Agent Session

[YOU: optional, embed the DevRelay session or remove this section.]

## Prize Categories

- **Gemma**: Gemma 3 4B vision runs on the family phone (llama.rn) for prescription reading, pill imprints, pill descriptions and the weekly family summary.
- **Arduino**: the optional pill box is an Arduino sketch on an ESP32 (BLE + USB serial), with a Wokwi diagram for testing without hardware.

[YOU: check the category names on the challenge page before publishing.]

---

## Honest limits

- It is a prototype. **It is not a medical device** and has not been tested with doctors.
- Pill photos cannot safely identify a medicine; Mathaka only uses them as an extra check, after the schedule and the box slot.
- Sinhala speech recognition and Sinhala/Tamil phone voices may be missing; the words are always on the screen.
- Gemma vision needs a stronger phone (about 6 GB RAM); weaker phones use the laptop helper for the one-time calibration.
- It does not replace a carer. It gives the carer one less worry.

<!--
SCREENSHOTS TO ADD (from the web build: npm run web, or tools/web-shots.mjs):
1. Elder home at 8:10 (Sinhala), lit morning slot
2. "Did I take it?" answer screen
3. Dose screen with pill pictures
4. Family dashboard (hero ring + tiles)
5. Calibration review: real photo vs drawn pill
6. Look-alike warning
7. Fridge card PDF
8. Arduino box (photo or Wokwi screenshot)
9. eval/report.md table
-->
