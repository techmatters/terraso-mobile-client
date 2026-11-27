# Android emulator troubleshooting

Read from the `android-simulator` skill when the app fails to load, dies, or something on screen is missing from the layout.

## App fails to load

- **Blank white screen, bundle never loads**: check Metro answers: `curl -s -m 5 localhost:8081/status` should print `packager-status:running`. If it hangs, another process may hold port 8081 (e.g. a second `npm run android` mid-build). Tell the user; don't kill their processes.
- **Red screen about missing config values (e.g. `SENTRY_*`)**: Metro was started without the secrets, e.g. with `npx expo start` instead of `npm run start`. Ask the user to restart it with `npm run start`.
- **"Unable to resolve module …" for a file that exists in `node_modules`**: Metro was started before `node_modules` was reinstalled, so its cache is stale. Ask the user to restart Metro with `npm run start -- --clear` (from `dev-client`).
- **"React Native version mismatch" or "Cannot find native module '…'"**: the installed native build predates a native dependency change. Compare `adb shell dumpsys package org.terraso.landpks | grep lastUpdateTime` with `git log -1 --format=%ci -- dev-client/package.json`. Ask the user to run `npm run rebuild-native-android`, which builds and installs against the running Metro. Avoid `rebuild-all-android` unless deps are broken: it deletes `node_modules`, runs `npm ci`, and starts its own Metro on 8081.
- **Login screen when the user was signed in, or backend errors**: the backend URL in the user's secrets `.env` may be stale (e.g. their IP changed after switching wifi). Ask them to check it, then restart Metro.

## App dies or the emulator hangs

- **App silently restarts, or sign-in fails with `state_mismatch` / "no ID token found"**: Android's low-memory killer killed the app, often while the sign-in browser tab was in front. Confirm with `adb logcat -b all -d | grep -i 'lowmemorykiller.*landpks'`. Look for lines naming the app; don't infer it from the timing of other kills.
  - Fix (the user does it, with the emulator off): set `hw.ramSize=4096` in `~/.android/avd/<name>.avd/config.ini`.
  - Then cold-boot once: `emulator -avd <name> -no-snapshot-load`, or Device Manager → Cold Boot Now. The saved snapshot keeps the old memory size.
- **`adb` commands or `npm run android` hang with no output while `adb devices` still says `device`**: the emulator is wedged (seen after days of uptime); `adb shell echo ok` hangs too. Ask the user to restart the emulator and run `adb kill-server`. Then wait for `adb shell getprop sys.boot_completed` to print `1`.
- **`CxxInspectorPackagerConnection` NullPointerException crash in a dev build**: it follows a debugger connection timeout. Relaunch the app.

## Layout and input problems

- **`android layout` hangs, times out, or fails with "Could not obtain idle state"** while something animates continuously (spinner, video): pass `--no-idle` to `layout.py`.
- **A tap reports `success` but nothing happens, on a button near the Sites bottom sheet**: the button probably sits under the sheet's touch area, or under its handle (`desc="Bottom sheet handle"`), so the sheet catches the tap. Compare the button's y with the handle's y in the element list. Fix: drag the map up (`adb shell input swipe 200 800 200 450 800`) until the button is well above the handle, then tap again. Dragging the handle down to collapse the sheet didn't work. A common cause: the search and floating "My Location" button centers the map on the user with no bottom padding, so the location callout's buttons can land under the sheet. Tapping the map, or the blue location dot, leaves room for the sheet.
- **Only a small floating keyboard handle appears instead of the keyboard**: the keyboard switched to floating mode, possibly after the user typed on the Mac keyboard into the emulator. Tap the handle, then "Show on-screen keyboard". That menu isn't in the layout, so use the annotated screenshot to find it. Typing with `android input text` avoids needing the keyboard at all.
