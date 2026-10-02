# Build the Android app in the cloud (EAS)

You don't need Android Studio or an emulator. Expo's servers build the APK for you.

## One time: set up

Run these in a terminal (PowerShell is fine):

```sh
npm i -g eas-cli          # the EAS command line tool
cd apps/mobile
eas login                 # your Expo account (make one free at expo.dev if needed)
eas init                  # links this app to your Expo account
```

`eas init` adds `owner` and `extra.eas.projectId` to `apps/mobile/app.json`. **Commit that change.**
`eas.json` already exists, so you do not need `eas build:configure`. If you run it anyway, keep our `eas.json`.

## Development build (for coding with hot reload)

```sh
cd apps/mobile
eas build --profile development --platform android
```

1. The first time, it asks **"Generate a new Android Keystore?"** Answer **Yes**. EAS keeps the key safe for you.
2. Wait for the build. The free plan can queue for a while (often 10–30 minutes).
3. At the end you get a **link and a QR code**. Open it on your phone and download the APK.
4. Install the APK. Android will ask to **allow installs from this source** (your browser). Allow it.
5. On the laptop, start the dev server. The phone and the laptop must be on the **same Wi-Fi**:

   ```sh
   cd apps/mobile
   npx expo start --dev-client
   ```

6. Open **Mathaka** on the phone. It finds the laptop, or you scan the QR code from the terminal.
   If it can't connect (some routers block it), use `npx expo start --dev-client --tunnel`.

Now JavaScript changes reload on the phone right away.

**When do I need a new build?** Only when a **native** thing changes: a new native package, or a change in the `plugins` / `android` part of `app.json`. I will always tell you when.

## Shareable app (for judges and family)

```sh
cd apps/mobile
eas build --profile preview --platform android
```

This makes a normal APK with no dev server needed. Share the link from the build page.

## Profiles (`apps/mobile/eas.json`)

| Profile | What | Demo data |
|---|---|---|
| `development` | Dev client APK, connects to your laptop | on |
| `preview` | Normal APK to share | on |
| `production` | Play Store bundle (not used now) | off |

## Before every build

```sh
cd apps/mobile
npx expo-doctor        # must say all checks passed
```

## What the build includes that Expo Go can't do

- The low reminder chime (`assets/sounds/chime_low.wav`, 440–660 Hz).
- Exact-time reminders (`SCHEDULE_EXACT_ALARM`). On Android 14+, you may need to allow
  "Alarms & reminders" for Mathaka in the phone's app settings.
- Later: on-device AI (llama.rn, onnxruntime), Bluetooth pill box, direct SMS.

## If something goes wrong

- **Build fails:** open the build page link and copy the red error lines to me.
- **App opens but shows "No development servers found":** check that both devices are on the same Wi-Fi, or use `--tunnel`.
- **Old app still installed from Expo Go tests:** that's fine. The dev build is a separate app.
