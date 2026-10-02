# Mathaka (මතකය)

A dementia-friendly medicine helper for older people in Sri Lanka. Android first.
All AI runs **on the phone**, with open-weight models. There is no cloud.

> **A reminder is not remembering.** Alarm apps say *when*. Mathaka also answers *whether* you already took it.

**Status:** prototype, milestone M3 (elder flow + cloud build setup). **Not a medical device.** See [Honest limits](#honest-limits).

## Repo layout

| Folder | What |
|---|---|
| `apps/mobile/` | Expo app (TypeScript, expo-router). One app with two roles: family/buddy phone and elder phone. |
| `packages/core/` | Pure TypeScript logic shared by the app and the Node eval (types, schedule, demo seed, AI contracts). |
| `tools/` | `generate-assets.mjs` (icons, pills, logo), `make-mat.ts` (printable calibration mat), `make-chime.mjs` (low reminder sound), `web-shots.mjs` (screenshots). |
| `helper/` | Optional laptop helper (FastAPI + Ollama + Laya), from M5. |
| `firmware/esp32/` | Optional BLE pill box, from M9. |
| `eval/` | Frozen test sets, eval scripts and results, from M7/M10. |
| `docs/` | Architecture, demo script and model notes, from M11. |

## Setup (Windows or macOS)

You need **Node 20 or newer** and **git**. Python 3.11/3.12 is only needed later, for `eval/` and `helper/`.

```sh
npm install                       # from the repo root (npm workspaces)
cp .env.example apps/mobile/.env  # Windows PowerShell: Copy-Item .env.example apps/mobile/.env
npm run assets                    # regenerates apps/mobile/assets/generated (already committed)
```

### Run on the laptop (web preview)

```sh
npm run web          # opens http://localhost:8081 in your browser
```

- In Chrome, press **F12**, then **Ctrl+Shift+M** (macOS: **Cmd+Shift+M**) and pick an Android phone size.
- On web, storage is **in memory**: a page reload resets the demo data. AI is a **mock**.

### Run on an Android phone (Expo Go)

1. Install **Expo Go** from the Play Store (it must support Expo SDK 57).
2. Put the phone and the laptop on the same Wi-Fi.
3. Run `npm start` and scan the QR code with Expo Go.

If the phone can't connect (some routers block it), use `npx expo start --tunnel` inside `apps/mobile`.

### Run the real Android app (EAS cloud build)

On-device AI, the low chime and exact reminders need a **development build** made in the cloud. No Android Studio is needed. Follow [docs/eas-build.md](docs/eas-build.md).

## Checks

```sh
npm test             # core (node:test) + app (Jest)
npm run typecheck    # tsc --noEmit in every workspace
cd apps/mobile && npx expo export --platform web   # web bundle must compile
cd apps/mobile && npx expo-doctor                  # must pass before every EAS build
```

## Demo mode

`EXPO_PUBLIC_DEMO_MODE=true` seeds an elder ("Ammi"), 4 demo medicines that match the demo pill images, and 7 days of history with a few missed doses and one stopped double dose. Family screen → **Reset demo data** starts it again.

## Honest limits

- Prototype. **Not a medical device**, and not tested with doctors.
- Pill photos can't safely identify a medicine. Mathaka only uses them as an extra check, after the schedule and the box slot.
- Sinhala speech recognition and TTS may be limited.
- Gemma vision needs a stronger phone. Weak phones will need the laptop helper for calibration.
- It does not replace a carer. It gives the carer one less worry.

## Licence

Apache-2.0 for the code. Model licences are listed in `docs/models.md` (M11).
