---
name: ios-simulator
description: Drive the LandPKS app in an iOS simulator (launch, navigate, tap, type, screenshot) to reproduce a bug or check that a change works in the real app. Use when asked to try something in the simulator, click through a flow, or verify UI behavior beyond unit tests.
---

# Driving the app in the iOS simulator

Uses the MobileBuildMCP server (tools named `mcp__MobileBuildMCP__*`). Add to this file whenever you hit a new gotcha.

## Prerequisites

If the `mcp__MobileBuildMCP__*` tools aren't available, stop and tell the user to install the server (then restart the session):

```sh
claude mcp add -s user MobileBuildMCP \
  -e MOBILEBUILDMCP_ENABLED_WORKFLOWS=simulator,ui-automation \
  -e MOBILEBUILDMCP_SENTRY_DISABLED=true \
  -- npx -y mobilebuildmcp@<version> mcp
```

`ui-automation` is required for tap/type/swipe; it is off by default.

Other MCP clients: use the same command, args, and env vars in that client's MCP config; see the client snippets at https://www.mobilebuildmcp.com/docs.

## Getting the app running

1. **Metro must be running** (`lsof -nP -iTCP:8081 -sTCP:LISTEN`). If it's not running in the user's terminal, start it yourself.
2. **Pick a booted simulator that has the app installed**: `list_sims`, then `xcrun simctl get_app_container <udid> org.terraso.landpks app` (errors if not installed). If several qualify, just pick one.
3. `session_set_defaults` with `simulatorId` and `bundleId: org.terraso.landpks`. Don't pass `persist: true` — that writes a config file into the repo.
4. **Load the bundle via deep link** instead of tapping the Expo dev launcher (launcher taps are sometimes dropped):
   ```sh
   xcrun simctl openurl <udid> "exp+landpks://expo-development-client/?url=http%3A%2F%2F<metro-host>%3A8081"
   ```
   `<metro-host>` is the host in the dev launcher's server list; if the app is sitting on the launcher, a `snapshot_ui` shows it in the server button's label (e.g. `LandPKS Soil ID, http://<host>:8081`).
5. `wait_for_ui` with `predicate: settled` and a long timeout (60–90s) while the bundle loads.

### If it fails to load

- **"React Native version mismatch"** red box: that simulator's native build is stale. Use another simulator, or ask the user before rebuilding (`npm run ios` takes minutes).
- **Login screen (Google/Microsoft/Apple only)**: never sign in with the user's accounts. Issues connecting to the backend may be due to a stale backend URL in the user's secrets `.env` (e.g. their IP changed after switching wifi) — ask them to check it and restart Metro. Otherwise ask them to sign in once; the session persists.

## Interacting

- **Always focus a text field before typing.** `type_text` on an unfocused field sends raw keystrokes, which trigger RN/Expo dev shortcuts (opens the dev menu, toggles the element inspector) and enter no text. Use `touch` (down+up) on the field first, then `type_text`.
- **Dismiss the keyboard before tapping buttons below the fields** — the keyboard covers them and the tap types a letter instead. Tap the keyboard's `return` key, then re-snapshot.
- **Check every action landed.** A tap can report success while the screen hash is unchanged. Compare `screenHash`, and take a `screenshot` (then Read the image) when unsure what's on screen. Retry once if nothing changed.
- **Don't run a tap and a wait in parallel**; do them one after the other.
- Element refs go stale after navigation, scrolling, or sheets opening — use refs from the latest snapshot only.
- Every element tends to appear twice in snapshots (e.g. `e75`/`e76` both "Create Site"); either ref works.
- "snapshot did not settle" warnings after a tap usually mean an animation or load is in progress — follow with `wait_for_ui` `settled`.
- Some icon-only buttons have no accessibility label and show up as blank buttons; identify them by position (tap result reports x/y) or a screenshot.

## Simulator setup

- **Location:** anything that uses the device's location silently does nothing until the simulator has a GPS position and the app has location permission:
  ```sh
  xcrun simctl location <udid> set 41.8781,-87.6298
  xcrun simctl privacy <udid> grant location org.terraso.landpks
  ```
