# iOS simulator troubleshooting

Read from the `ios-simulator` skill when the app fails to load or something on screen is missing from snapshots.

## App fails to load

- **"Unable to resolve module …" for a file that exists in `node_modules`**: Metro was started before `node_modules` was reinstalled, so its cache is stale. Restart Metro with `npm run start -- --clear` (from `dev-client`).
- **"React Native version mismatch" or "Cannot find native module '…'"**: the installed native build predates a native dependency change (compare `stat` on the `get_app_container` path with `git log -- dev-client/package.json`). Use another simulator if one has a newer build; otherwise ask the user, then rebuild (~6 min) against the running Metro:
  ```sh
  IOS_DEVICE_ID=<udid> npm run rebuild-native-ios
  ```
  Avoid `rebuild-all-ios` unless deps are broken: it deletes `node_modules`, runs `npm ci`, and starts its own Metro on 8081. The script may print "Build failed" when only Expo's final open-the-Simulator step errored; if the app container's timestamp is fresh, load via the deep link.
- **Login screen (Google/Microsoft/Apple only)**: never sign in with the user's accounts. Backend connection problems may come from a stale backend URL in the user's secrets `.env` (e.g. their IP changed after switching wifi); ask them to check it, then restart Metro. Otherwise ask them to sign in once; the session persists.

## Elements missing from snapshots

`@gorhom/bottom-sheet` sheets default to `accessible={true}`, which collapses their content into one "Bottom Sheet" element, so nothing inside appears in `snapshot_ui`. To interact anyway, press by coordinates with the AXe CLI bundled with MobileBuildMCP:

```sh
AXE=$(find ~/.npm/_npx -path '*mobilebuildmcp/bundled/axe' -type f | head -1)
$AXE touch -x <x> -y <y> --down --up --delay 0.15 --udid <udid>
```

Note: if the npx cache holds several MobileBuildMCP versions, `head -1` picks one arbitrarily, possibly an old or unvetted copy. Check that `"$(dirname "$(dirname "$AXE")")/package.json"` has the version you pinned, and if not, choose the matching path from the `find` output.

Coordinates are in points, not screenshot pixels: scale screenshot positions by (screen width in points ÷ screenshot width). The root element's frame from `$AXE describe-ui --udid <udid>` gives the screen size in points.
