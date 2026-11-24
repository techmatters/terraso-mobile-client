---
name: android-simulator
description: Drive the LandPKS app in an Android emulator (launch, navigate, tap, type, screenshot) to reproduce a bug or check that a change works in the real app. Use when asked to try something on Android or in the emulator, click through a flow, or verify UI behavior beyond unit tests.
---

# Driving the app in the Android emulator

Uses Google's [Android CLI](https://developer.android.com/tools/agents/android-cli) (`android`) to read and drive the UI, and `adb` for everything else (deep links, GPS, logs). Paths below are relative to the repo root.

If you hit a new problem and find a reliable fix that other teammates are likely to hit too, propose adding it to [troubleshooting.md](troubleshooting.md) and ask the user before editing. Skip one-offs specific to one machine or session.

## Prerequisites

- `adb` on `PATH` (from the Android SDK; see the repo README).
- Android CLI. If `command -v android` fails, stop and ask the user to install it (`brew install --cask android-cli`, or see the link above). Its first run shows Google's terms and downloads its runtime.
- **Pass `--no-metrics` to every `android` command.** Without it, Google collects usage data (commands and flags used); there's no global opt-out.
- **No personal account on the emulator's system.** The Google account added to the emulator itself (Android Settings → Passwords & accounts) should be a test account with no personal data, or none at all, because you can see and use any app on the device. This is separate from signing in to LandPKS (step 5 below). If you notice signs of a personal account on the device (e.g. personal email notifications), mention it to the user.

## Getting the app running

1. **The user starts the emulator and Metro; you don't.** Check with `adb devices` (an `emulator-5554  device` line) and `lsof -nP -iTCP:8081 -sTCP:LISTEN`. If either is missing, ask the user to start them in their own terminal, from `dev-client`, and wait:
   - `npm run android`: builds and installs the app, boots an emulator if none is running, and starts Metro.
   - `npm run start`: Metro only, when the app is already installed and an emulator is running.

   Don't start Metro yourself: a background Metro is invisible to the user and dies with your session. Don't boot an emulator without asking. Metro reads the secrets `.env` only at startup, so after the user edits that file, ask them to restart it. If several devices are listed, pass `--device=<serial>` to `android` and `-s <serial>` to `adb`.

2. **Check the app is installed**: `adb shell pm path org.terraso.landpks`.
3. **Load the bundle** if the app isn't showing LandPKS screens (e.g. it's on the Expo dev launcher, or you force-stopped it):
   ```sh
   adb reverse tcp:8081 tcp:8081
   adb shell am start -a android.intent.action.VIEW -d "exp+landpks://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" org.terraso.landpks
   ```
   `adb reverse` lets the emulator's `localhost:8081` reach Metro on the Mac. `npm run android` usually sets it up, and re-running it is harmless.
4. **Wait for the JS to render.** `android layout` waits for the native UI to go idle, not for the bundle, so right after launch it returns a near-empty screen. Wait for a known element:
   ```sh
   python3 .claude/skills/android-simulator/scripts/layout.py --wait-for Sites --timeout 90
   ```
5. **The user signs in, never you.** If you see the login screen (Google/Microsoft/Apple buttons), ask the user to sign in in the emulator; the session persists across app restarts. Never sign in with the user's accounts.

**Before trusting a visual bug, cold-start** (`adb shell am force-stop org.terraso.landpks`, then step 3): Fast Refresh can leave stale state that looks like a bug.

**If the app fails to load, dies, or something visible is missing from the layout, read [troubleshooting.md](troubleshooting.md).**

## Seeing the screen

- **Element list**: `python3 .claude/skills/android-simulator/scripts/layout.py` prints one line per element in the app's windows:
  ```
  666,1197  #search-bar  text="Search sites"  [tap,long,edit]
  523,1698  desc="Projects"  [tap]
  ```
  That's the center in screen pixels, the `testID` (Android `resource-id`), the visible `text=` and/or accessibility label `desc=`, and what it accepts. The `text=`/`desc=` prefix is the selector key to match it with: tabs and icon buttons usually match only by `desc=`. Use it rather than raw `android layout`, whose output includes the status bar, and the status bar's notification descriptions can expose the user's email and account alerts.
  - **Right after a tap that navigates, the list can still show the previous screen** (or be empty; the script retries that). Before trusting it, use `--wait-for <value>` with an element of the screen you expect, or `--wait` on your next tap. `--wait-for` matches a testID, text, or label exactly, or `/regex/`; it prints the list once found, or exits 1 after `--timeout` seconds (default 60).
  - **Some content takes many seconds** (soil ID results, map tiles, sync). Wait for the specific element you need with `--wait-for` and a generous `--timeout`, not a fixed `sleep`.
  - `(no label)  [tap]` is usually an icon button without an `accessibilityLabel`; tap it by coordinates.
  - Elements often appear twice (the touchable and its text); either works.
  - A floating "Tools" button (dev builds only) sits on every screen; ignore it.
  - Screens show the signed-in user's personal data (e.g. their email on Settings). Don't copy it into reports, commits, or issues.
  - `== keyboard is open` means the keyboard covers the bottom of the screen; elements under it are missing.
- **Screenshot**: `android screen capture --no-metrics -o <scratchpad>/s.png`, then shrink it before Reading, to save context: `sips -Z 900 s.png --out s-small.png`. Coordinates measured on the shrunken image must be scaled back up to screen pixels before tapping.
- **Elements not in the layout** (map contents, anything drawn rather than built from views): `android screen capture --no-metrics --annotate -o a.png` numbers what it detects visually. Read it, then `android screen resolve --no-metrics --screenshot=a.png --string="adb shell input tap #12"` prints the command with box 12's center filled in.

## Interacting

- **Selectors** (for `android input tap|text|scroll|swipe`) are comma-separated `key=value` pairs: `id`, `text`, `desc` (accessibility label), `class`, and booleans like `clickable=true`. Quote them for the shell.
  - **Values match as case-insensitive substrings.** So `id=search-bar` also matches `search-bar-container`, `search-bar-icon`, etc., and the command fails with `multiple_matches` (listing the candidates). Anchor with a regex instead: `'id=/^search-bar$/'`, `'text=/^Sites$/'`. Regexes are case-sensitive, so copy the text exactly as the element list shows it (many buttons render in all caps, e.g. `CREATE SITE`).
- **Tap**: `android input tap --no-metrics 'id=/^search-bar$/'`. `--wait=<ms>` waits for the element to appear. Fallback by coordinates from the element list: `adb shell input tap <x> <y>`.
- **Type**: `android input text --no-metrics 'Claude test' 'id=/^search-bar$/'`. It replaces the field's whole value (it doesn't append; `''` clears it), handles spaces, fires the app's `onChangeText`, and doesn't open the keyboard. `--submit` presses Enter afterwards.
  - Don't tap the field first. Tapping opens the keyboard, which can push the field (e.g. in a bottom sheet) off screen so the selector no longer matches.
  - Raw fallback, typing into the focused field: `adb shell input text 'two%swords'` (`%s` is a space; ASCII only).
- **Leaving a screen**: tap the app's header back arrow, the unlabeled `(no label)  [tap]` at the top left (around `84,138`). Android system back in 3-button menu (`android input key --no-metrics back`) is mainly for closing the keyboard (if it's open, back only closes it); otherwise use it only occasionally, to check it behaves sensibly.
- **Scroll**: scroll containers usually have no testID, so swipe inside the content: `adb shell input swipe 540 1500 540 700 400` (x1 y1 x2 y2 ms; keep both points inside the area that should scroll). Avoid `android input scroll --match=first 'scrollable=true'`: the first scrollable is often a horizontal tab bar, so your "scroll" switches tabs (seen on the site screen). When a container does have a testID, `android input scroll --no-metrics --dir=down 'id=/^<testID>$/' --until='text=/^Delete$/'` scrolls until an element appears.
- **Swipe**: carousels and pagers ignore fast swipes. A 250 ms `adb shell input swipe x1 y1 x2 y2 250` didn't change page; 800 ms did.
- **Choosing a spot on the Sites map** (e.g. to create a site somewhere): tap the map or use the map search. Don't fake the device's GPS and press "My Location" just to get somewhere.
- **Report UI hidden by the bottom sheet.** If a button or callout content sits under the Sites bottom sheet (or you had to move the map to reach it), say so in your recap to the user. It may be a real UX bug, not just a problem with driving the emulator.
- **Check every action landed.** `"status": "success"` means the input was sent, not that the app reacted. Re-run the element list or take a screenshot after each step. Coordinates and elements go stale after navigation, scrolling, or a sheet opening.
- Each `android` call takes 1–2 s; chain several steps in one Bash call when you don't need to look in between.
- Don't send `adb shell input keyevent 82` (MENU): it opens the React Native dev menu.

## Emulator setup and logs

- **Location**: change the emulator's GPS only when the task is about the device's location (e.g. "My Location", GPS accuracy). Fake GPS changes the emulator for the user too, so tell them when you set it. Anything that uses the device's location silently does nothing until the emulator has a GPS position and the app has permission:
  ```sh
  adb emu geo fix -87.6298 41.8781   # longitude first, then latitude
  adb shell pm grant org.terraso.landpks android.permission.ACCESS_FINE_LOCATION
  ```
- **JS logs** (`console.*`): `adb logcat -d -s ReactNativeJS`. **Crashes**: `adb logcat -b crash -d`.
