---
name: ios-simulator
description: Drive the LandPKS app in an iOS simulator (launch, navigate, tap, type, screenshot) to reproduce a bug or check that a change works in the real app. Use when asked to try something in the simulator, click through a flow, or verify UI behavior beyond unit tests.
---

# Driving the app in the iOS simulator

Uses the MobileBuildMCP server (tools named `mcp__MobileBuildMCP__*`).

If you hit a new problem and find a reliable fix that other teammates are likely to hit too, propose adding it to [troubleshooting.md](troubleshooting.md) and ask the user before editing. Skip one-offs specific to one machine or session.

## Prerequisites

If the `mcp__MobileBuildMCP__*` tools aren't available, stop and tell the user to install the server (then restart the session):

```sh
claude mcp add -s user MobileBuildMCP \
  -e MOBILEBUILDMCP_ENABLED_WORKFLOWS=simulator,ui-automation \
  -e MOBILEBUILDMCP_SENTRY_DISABLED=true \
  -- npx -y mobilebuildmcp@<version> mcp
```

Replace `<version>` with an exact version: get the newest with `npm view mobilebuildmcp version` and skim its release notes before using it. Don't use `@latest`: npx would then download and run whatever was most recently published each time the server starts, so a broken or compromised release would run on your machine with your permissions, unreviewed.

`ui-automation` is required for tap/type/swipe; it is off by default.

Other MCP clients: use the same command, args, and env vars in that client's MCP config; see the client snippets at https://www.mobilebuildmcp.com/docs.

## Getting the app running

1. **Metro must be running** (`lsof -nP -iTCP:8081 -sTCP:LISTEN`). If it's not running in the user's terminal, start it yourself (`npm run start` from `dev-client`, in the background; it stops when your session ends). Metro reads the secrets `.env` only at startup, so restart it after the user edits that file.
2. **Pick a booted simulator that has the app installed**: `list_sims`, then `xcrun simctl get_app_container <udid> org.terraso.landpks app` (errors if not installed). If several qualify, just pick one.
3. `session_set_defaults` with `simulatorId` and `bundleId: org.terraso.landpks`. Don't pass `persist: true` — that writes a config file into the repo.
4. **Load the bundle via deep link** instead of tapping the Expo dev launcher (launcher taps are sometimes dropped):
   ```sh
   xcrun simctl openurl <udid> "exp+landpks://expo-development-client/?url=http%3A%2F%2F<metro-host>%3A8081"
   ```
   `<metro-host>` is the host in the dev launcher's server list; if the app is sitting on the launcher, a `snapshot_ui` shows it in the server button's label (e.g. `LandPKS Soil ID, http://<host>:8081`). Otherwise use the Mac's current IP (`ipconfig getifaddr en0`), not one from an earlier session.
5. `wait_for_ui` with `predicate: settled` and a long timeout (60–90s) while the bundle loads.

**If the app fails to load (red box, login screen), or something visible is missing from snapshots, read [troubleshooting.md](troubleshooting.md).**

## Interacting

- **Always focus a text field before typing.** `type_text` on an unfocused field sends raw keystrokes, which trigger RN/Expo dev shortcuts (opens the dev menu, toggles the element inspector) and enter no text. Use `touch` (down+up) on the field first, then `type_text`.
- **Dismiss the keyboard before tapping buttons below the fields** — the keyboard covers them and the tap types a letter instead. Tap the keyboard's `return` key, then re-snapshot.
- **Check every action landed.** A tap can report success while the screen hash is unchanged. Compare `screenHash`, and take a `screenshot` (then Read the image) when unsure what's on screen. If nothing changed, retry with `touch` (`down`+`up`, `delay: 0.15`); a slightly held press registers where a `tap` gets dropped.
- **Don't run a tap and a wait in parallel**; do them one after the other.
- Element refs go stale after navigation, scrolling, or sheets opening — use refs from the latest snapshot only.
- Every element tends to appear twice in snapshots (e.g. `e75`/`e76` both "Create Site"); either ref works.
- "snapshot did not settle" warnings after a tap usually mean an animation or load is in progress — follow with `wait_for_ui` `settled`.
- Snapshot targets read `ref|action|role|label|value|identifier`; the identifier is the component's `testID`, which `wait_for_ui` can select with `identifier`.

## Simulator setup

- **Location:** anything that uses the device's location silently does nothing until the simulator has a GPS position and the app has location permission:
  ```sh
  xcrun simctl location <udid> set 41.8781,-87.6298
  xcrun simctl privacy <udid> grant location org.terraso.landpks
  ```
