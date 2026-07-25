# Expo SDK 56 spike — phase 0 findings for the SDK 55 → 56 hop

Punch list from the phase-0 spike for the SDK 55 → 56 hop. Ran in a
throwaway git worktree branched from `chore/expo-sdk-55` (i.e. on top
of phase 1's committed work — Expo 55, RN 0.83.10, React 19.2.0, plus
@gorhom/bottom-sheet 5.2.14, @rnmapbox/maps 10.3.5, and the RN
AnimatedNode patch). Worktree was discarded after these findings were
captured. No commits made during the spike.

## Summary

**Phase 2 will be medium** — no dealbreakers surfaced. `native-base`
did not complain at install/typecheck/prebuild time (the biggest
flagged risk quietly cleared), all three patches still apply, prebuild
+ pod install both succeed cleanly, iOS 16.4 deployment target
auto-applies via prebuild. Real code work is small: the same React
overrides fixup as phase 1 (mechanical), 5 TS errors in one test file
from a stricter testing-library return type, and the jest preset
moved out of RN core (blocks all tests until wired up).

## Blocker before checks even ran

Same as phase 1: `expo install --fix` bumped React 19.2.0 → 19.2.3 in
`dependencies` but did NOT touch the `overrides` / `resolutions`
blocks. `npm install` then errored with `EOVERRIDE: Override for
react@19.2.3 conflicts with direct dependency`. **Manual fixup**: bump
React/react-dom in overrides + resolutions from 19.2.0 → 19.2.3 (13
pin sites, one sed). `@types/react` stays at ~19.2.10.

## Package bumps from `expo install --fix`

| Package | Old → New | Notes |
|---|---|---|
| `expo` | ~55.0.0 → ~56.0.0 | core |
| `react` / `react-dom` | 19.2.0 → 19.2.3 | overrides require manual fixup |
| `react-native` | 0.83.10 → 0.85.3 | matches vision-camera 5.1.1 tested combo ✓ |
| `react-native-reanimated` | 4.2.1 → 4.3.1 | |
| `react-native-worklets` | 0.7.4 → 0.8.3 | bumped alongside reanimated |
| `react-native-safe-area-context` | ~5.6.2 → ~5.7.0 | |
| `react-native-screens` | ~4.23.0 → ~4.26.0 | |
| `react-native-gesture-handler` | ~2.30.0 → ~2.31.1 | |
| `react-native-pager-view` | 8.0.0 → 8.0.1 | patch only (major already done in phase 1) |
| `react-native-svg` | 15.15.3 → 15.15.4 | |
| `@react-native-community/netinfo` | 11.5.2 → **12.0.1** | major bump — not flagged in original plan; check API |
| ~25 `expo-*` packages | 55.x → 56.x | mechanical |

**Flagged but NOT auto-bumped** (`expo install --fix` doesn't touch
devDependencies):

- `typescript` 5.9.3 → 6.0.3 (major)
- `jest-expo` ~55.0.20 → ~56.0.5
- `@babel/core` 7.28.4 → ^7.29.0

**Not bumped** (not Expo-managed):
- `@sentry/react-native` (~7.11.0) — peer allows RN 0.85; Sentry 7→8
  upgrade can stay deferred
- `@sentry/core` — aligned with Sentry 7
- `native-base` — patch still applies
- `posthog-react-native`, `@rnmapbox/maps`, `@gorhom/bottom-sheet`,
  `react-navigation`, `redux-toolkit` — all unchanged

## Breakages enumerated

### TypeScript — 5 errors, all in one file

```
__tests__/integration/OfflineSnackbar.test.tsx(223,17): error TS2345:
  Argument of type 'ReactTestInstance | null' is not assignable to
  parameter of type 'ReactTestInstance'.
```

Same error at lines 223, 234, 259, 287, 296. testing-library's
`getByX` return type became stricter; needs `!` non-null assertion or
explicit narrowing. ~15 min total.

### ESLint / Prettier — green

Zero warnings, zero errors, zero drift.

### Unit tests — all failed at setup (jest preset moved)

```
Test suite failed to run
  An unknown error occurred in jest-expo:
  The React Native Jest preset has moved to a separate package.
  To migrate, please install "@react-native/jest-preset" and update your
  jest.config.js to reference:
    preset: '@react-native/jest-preset'
```

Blocks all test suites. Fix: `npm install --save-dev
@react-native/jest-preset` + update the `preset:` field in
`jest.unit.config.js` and `jest.integration.config.js`.

### iOS prebuild + pod install — succeeded

Clean run. Only warning is Expo saying SDK 57 is "recommended" — safe
to ignore, we're intentionally targeting 56.

## Surprises / red flags

- **`native-base` didn't complain** at install/typecheck/prebuild.
  Biggest risk in the plan quietly cleared. Runtime is the real test,
  but no new patch requirements surfaced.
- **iOS 16.4 deployment target auto-bumped** — both `ios/Podfile` and
  `LandPKSSoilID.xcodeproj/project.pbxproj` show `16.4` after prebuild.
  Only manual change needed is bumping `LSMinimumSystemVersion: '12.0'`
  → `'16.4'` in `app.config.ts:148` for consistency.
- **`react-native+0.83.10.patch` still applies** but with a
  version-drift warning. Rename to `+0.85.3.patch` and re-verify
  context matches RN 0.85's AnimatedNode source.
- **`@react-native-community/netinfo` 11 → 12** — real major bump not
  in the original plan's audit. Check for breaking API changes.
- **TypeScript stays at 5.9.3** even though SDK 56 wants 6.0.3.
  Deferred; TS 6 upgrade is real work and can be its own PR.
- **Sentry stays on 7.11** — peer deps allow RN 0.85. Sentry 7 → 8
  upgrade continues to be its own future project.
- **Mapbox + bottom-sheet** stayed at phase-1 versions — no new
  crash-fixup bumps needed for the 0.83 → 0.85 hop (unlike the
  0.81 → 0.83 hop).

## Recommended fixes for phase 2 (in order)

1. Bump React pins in `package.json` `overrides` + `resolutions` from
   19.2.0 → 19.2.3 (13 pin sites; single sed). `@types/react` stays.
2. Run `npx expo install expo@~56.0.0 --fix`.
3. Bump `jest-expo` ~55.0.20 → ~56.0.5 and `@babel/core` ^7.28.4 →
   ^7.29.0 manually (both devDeps).
4. **Skip TypeScript 6.0.3** in this PR. Defer to its own follow-up.
5. Install `@react-native/jest-preset` and update
   `jest.unit.config.js` + `jest.integration.config.js` to reference
   `preset: '@react-native/jest-preset'`.
6. Fix the 5 `OfflineSnackbar.test.tsx` errors — add `!` after `getBy*`
   calls or narrow with `if (x == null) throw ...`.
7. Rename `patches/react-native+0.83.10.patch` →
   `patches/react-native+0.85.3.patch`. Verify the patched context
   (AnimatedNode.__callListeners) is unchanged in RN 0.85's source.
8. Bump `LSMinimumSystemVersion: '12.0'` → `'16.4'` in `app.config.ts`
   for consistency with the auto-applied deployment target.
9. `rm -rf ios android && npm run prebuild` — regenerate.
10. Real device build + smoke test on iPhone. Focus on: same sites /
    soil flows, tab-scroll (pager-view stayed at 8.x), watch for any
    new `_listeners.forEach`-style crashes from RN 0.85 changes.
11. Ship as `chore/expo-sdk-56` PR **stacked on `chore/expo-sdk-55`**
    (base = phase-1 branch, not main).
