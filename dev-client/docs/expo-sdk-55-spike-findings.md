# Expo SDK 55 spike — phase 0 findings

Punch list produced by phase 0 of the upgrade plan
(see `docs/expo-sdk-56-plan.md`). Ran in a throwaway git worktree; the
worktree was discarded after these findings were captured. No commits
made during the spike.

## Summary

**Phase 1 (SDK 54 → 55) is easy → medium**, ~0.5–1 day of real work,
no dealbreakers. `expo install --fix` bumped 38 packages cleanly;
existing patches (`@rnmapbox/maps` + `native-base`) applied without
modification; iOS prebuild succeeded; ESLint + Prettier stayed green.
The remaining work is mechanical: one manual `package.json` fixup
before `npm install` will even run, then three TS errors and one
missing direct dep.

## Blocker before checks even ran

`expo install --fix` bumped React from 19.1 → 19.2 in `package.json`
but did NOT touch our `overrides` and `resolutions` blocks (which hard-
pin React to 19.1). The follow-up `npm install` errored with
`EOVERRIDE: Override for react@19.2.0 conflicts with direct dependency`.
Same for `react-dom` and `@types/react`.

**Fix:** manually bump these in `package.json` from 19.1 → 19.2
(`~19.2.10` for `@types/react`) BEFORE running `expo install --fix`, or
run `expo install --fix` first, then patch the overrides manually and
re-run `npm install`. Either way, five entries need editing:

- `dependencies.react`
- `dependencies.react-dom`
- `devDependencies.@types/react`
- `overrides.react` + `overrides.react-dom` + `overrides.@types/react`
  (top-level; also the nested overrides under `@reduxjs/toolkit` and
  `terraso-client-shared`)
- `resolutions.react` + `resolutions.react-dom`

After the fix: `npm install` succeeded (27 added, 46 removed, 86
changed, 44 vulns down from 51).

## Package bumps from `expo install --fix`

| Package | Old → New | Notes |
|---|---|---|
| `expo` | 54.0.13 → ~55.0.0 | core |
| `react` | 19.1.0 → 19.2.0 | overrides block also needs manual bump |
| `react-dom` | 19.1.0 → 19.2.0 | same |
| `react-native` | ^0.81.5 → 0.83.6 | Expo warns: **recommended 0.83.10** — trivial extra bump |
| `react-native-reanimated` | ~4.1.3 → 4.2.1 | |
| `react-native-worklets` | 0.6.1 → 0.7.4 | bumped alongside reanimated ✓ |
| `react-native-pager-view` | 6.9.1 → **8.0.0** | major bump; check `@react-navigation/material-top-tabs` UI |
| `react-native-gesture-handler` | ~2.28.0 → ~2.30.0 | |
| `react-native-safe-area-context` | ~5.6.1 → ~5.6.2 | patch |
| `react-native-screens` | ~4.16.0 → ~4.23.0 | |
| `react-native-svg` | 15.14.0 → 15.15.3 | patch |
| `@react-native-community/netinfo` | ^11.4.1 → 11.5.2 | pinned exact |
| `@sentry/react-native` | ~7.2.0 → ~7.11.0 | still v7 (major bump to v8 is a phase-2 concern) |
| `@types/react` | ~19.1.10 → ~19.2.10 | overrides block also needs manual bump |
| `jest-expo` | ~54.0.17 → ~55.0.20 | |
| ~20 more `expo-*` packages | 54.x → 55.x | mechanical |

Not bumped by `expo install --fix` (not Expo-managed): `@rnmapbox/maps`,
`native-base`, `@sentry/core`, `posthog-*`, `react-navigation`,
`redux-toolkit`, `formik`, `yup`, `i18next`. All left at their current
versions — real bump decisions on these can wait until phase 2 (or
their own PRs).

## Breakages enumerated

### TypeScript — 3 errors, all local

- **`src/app/Sentry.tsx:38`** — `Integration` type mismatch between
  top-level `@sentry/core` (~10.12.0) and the nested `@sentry/core`
  that `@sentry/react-native@~7.11.0` bundles. **Fix:** either drop
  the top-level `@sentry/core` dep and import from
  `@sentry/react-native`, or align top-level `@sentry/core` to
  whatever version `react-native@7.11` nests. ~15 min.
- **`src/components/modals/PermissionsRequestWrapper.tsx:22`** —
  `Cannot find module 'expo-modules-core'`. Root cause: SDK 55 nests
  `expo-modules-core` inside `node_modules/expo/node_modules/`, so
  top-level `import 'expo-modules-core'` no longer resolves. Same
  root cause as all 38 test failures below. **Fix:** add
  `expo-modules-core: ~55.0.25` as a direct dep. ~2 min.
- **`src/localization.test.ts:102`** — `Argument of type '[]' is not
  assignable to parameter of type '[Locale, ...Locale[]]'`. Upstream
  API now requires a non-empty tuple. **Fix:** pass a real (or dummy)
  locale in that call site. ~5 min.

### ESLint / Prettier — green

Zero warnings, zero errors, zero formatting drift.

### Unit tests — 38/38 suites failed, all identical root cause

Every unit test suite dies at `jest-expo/src/preset/setup.js:218` with
`Cannot find module 'expo-modules-core'`. Same root cause as the
PermissionsRequestWrapper TS error — adding `expo-modules-core` as a
direct dep fixes all 38 in one shot. Zero tests actually ran, so we
don't know whether real tests pass — need to fix the setup crash
first, then re-run.

### iOS prebuild — succeeded

`npm run prebuild -- -p ios` completed cleanly. Only warning: `Using
react-native@0.83.6 instead of recommended react-native@0.83.10` —
`expo install --fix` pinned an older patch than Expo actually
recommends.

## Surprises / red flags

- **`newArchEnabled: true` still in `app.config.ts:97` and did NOT
  warn.** The plan doc claims the flag was removed in SDK 55 — but
  SDK 55 still tolerated it silently on prebuild. Safe to leave for
  now, but remove opportunistically in case SDK 56 warns/errors.
- **`react-native-pager-view` jumped a major (6 → 8)** — not flagged
  in the plan's audit table. Used by
  `@react-navigation/material-top-tabs`. Worth a quick smoke test of
  any tab-scroll UI (site detail's tabs).
- **`@sentry/core` (~10.12.0) is NOT Expo-managed** — was not bumped,
  so it drifts from what `@sentry/react-native@7.11` internally pins.
  This produces the one Sentry TS error. Even without going to
  Sentry 8, phase 1 needs to reconcile.
- **`native-base` didn't complain at all yet.** Its patch applied
  cleanly. But we haven't built or booted the app to see runtime
  behavior. The RN 0.83 → 0.85 hop is where more risk lives (phase 2).
- **`@rnmapbox/maps` patch applied cleanly** without re-adjustment.
  Version stayed at `^10.2.4` (Expo doesn't manage it); resolved
  installed version is still 10.2.5.
- **44 npm vulns** (down from 51 on SDK 54). Not a regression; some
  deps just have fewer known CVEs at their newer versions.

## Recommended fixes for phase 1 (in order)

1. Bump React pins in `package.json` `overrides` + `resolutions` +
   `devDependencies` (`@types/react`) from 19.1.0 → 19.2.0
   (~19.2.10 for `@types/react`).
2. Run `npx expo install expo@~55.0.0 --fix` — writes the rest of the
   version bumps to package.json.
3. Bump `react-native` from `0.83.6` → `0.83.10` (Expo's recommended
   patch).
4. Add `expo-modules-core: ~55.0.25` as a direct dep (unblocks
   jest-expo + `PermissionsRequestWrapper`).
5. Reconcile `@sentry/core` (~10.12.0) with `@sentry/react-native@
   ~7.11.0` — align versions or drop the top-level dep.
6. Fix `src/localization.test.ts:102` — pass a non-empty `Locale`
   tuple.
7. Remove `newArchEnabled: true` from `app.config.ts:97` (cosmetic;
   still tolerated on SDK 55, likely warns/errors on SDK 56).
8. `rm -rf ios android && npm run prebuild` — regenerate.
9. Real device build + smoke test (login, site list, one soil-input
   flow, map render, POEditor sync). Check for pager-view (v6 → v8)
   regressions in the tab-scroll UI.
10. Ship as `chore/expo-sdk-55` PR.
