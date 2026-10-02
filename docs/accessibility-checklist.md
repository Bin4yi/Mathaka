# Accessibility checklist (elder screens)

Tick each box on a real phone. Record the phone model, Android version and date at the bottom.
Automated checks already run on every commit:

- **Contrast:** `src/a11y/contrast.test.ts` checks every theme pair (elder text ≥ 7:1).
- **a11y lint:** `npm run lint` runs `eslint-plugin-react-native-a11y`.
- **Labels:** `src/__tests__/elderFlow.test.tsx` checks that every touchable has a label.

| Check | Home | Dose | Confirm | Answer | Pill | PIN |
|---|---|---|---|---|---|---|
| Font size 100%: nothing cut off | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Font size 150%: wraps, scrolls | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Font size 200% + display size max: wraps, scrolls | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Sinhala marks not cut (top and bottom) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Tamil marks not cut | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| TalkBack: every button is read with a clear label | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| TalkBack: focus starts at the main message | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| TalkBack: answer is announced (live region) | – | – | – | ☐ | – | – |
| Max 2 big buttons, always at the bottom | ☐ | ☐ | ☐ | ☐ | ☐ | – |
| "Say it again" works | ☐ | ☐ | ☐ | ☐ | – | – |
| High-contrast theme: all icons visible | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Dark theme: all icons visible | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Readable from 60 cm on a phone stand | ☐ | ☐ | ☐ | ☐ | ☐ | – |
| One-hand use (thumb reaches both buttons) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Dark room: no glare, readable | ☐ | ☐ | ☐ | ☐ | ☐ | – |
| Sunlight: readable (dose screen raises brightness) | ☐ | ☐ | – | – | – | – |
| Fast double tap logs only once | – | – | ☐ | – | – | – |
| Sliding a finger off a button cancels it | ☐ | ☐ | ☐ | ☐ | ☐ | – |
| After 2 min with no touch, goes back home | – | ☐ | ☐ | ☐ | ☐ | – |
| No words like "wrong" or "missed" are shown to the elder | ☐ | ☐ | ☐ | ☐ | ☐ | – |

## Reminders (elder phone)

- ☐ The reminder arrives with the app closed (at the due time, +10 min, +20 min).
- ☐ The medicine vibration pattern (long, pause, long) is easy to tell apart from other alerts.
- ☐ Tapping the reminder opens the dose screen.
- ☐ Works with Bluetooth earphones / hearing-aid streaming.

## Not done yet (planned)

- Low-tone chime (400–1000 Hz) as the notification sound: needs a dev build (M3).
- Visual alarm (slow screen pulse, max 1 flash per second) for deaf users: M8/M9.
- Colour-blind simulation of screenshots (`tools/cvd-sim`): M10.

Phone: ________  Android: ____  Date: ________  Tester: ________
