# Expo SDK 54 → 56 upgrade plan

## Motivation

We want RAW camera capture (see `raw-camera-plan.md`). The only RN camera
library that supports DNG output is `react-native-vision-camera` v5+.
v5.0.0 needs RN 0.84, v5.1.1 (current latest) needs RN 0.85. Our Expo
SDK 54 ships RN 0.81.5. Confirmed empirically: on RN 0.81 + vision-
camera v5.1.1, the camera crashes at first launch with a `castValue`
assertion in Fabric's `RawValue.h:453` — Fabric/Nitro ABI mismatch
between vision-camera's compiled expectations and RN 0.81's actual
runtime.

The Expo ↔ RN mapping (verified via expo/expo repo's `sdk-N` branch
templates):

| Expo SDK  | React Native | React  |
|-----------|--------------|--------|
| 54 (ours) | 0.81.5       | 19.1.0 |
| 55        | 0.83.10      | 19.2.0 |
| 56        | 0.85.3       | 19.2.3 |
| 57        | 0.86.0       | 19.2.3 |

We need SDK ≥ 56 for vision-camera v5 to work. This document plans the
bump.

## Recommended path: two hops (54 → 55 → 56), one PR each

Two smaller PRs. Rationale:

- SDK 55 → RN 0.83 is a "no breaking changes" RN release per Meta's
  blog. It's basically a free step and gives us a green intermediate
  main.
- SDK 55 landed real Expo-level breakage (legacy-arch drop, config
  removals, expo-av removal, Node/Xcode minimums, expo-video prop
  rename) — worth isolating from RN 0.85's animation-backend rewrite +
  iOS 16.4 minimum + Hermes V1 default.
- If SDK 55 exposes an unexpected dep-chain bomb, we can ship it as an
  interim state and hold on 56 without giving up the RN 0.83
  improvements.
- Reviewers can actually reason about ~30 file changes per PR instead
  of ~100.

Trade-off: two `npm install` / prebuild cycles instead of one. Modest
cost.

## Breaking changes that likely hit us

### SDK 54 → 55 (RN 0.83)

RN 0.83 itself is a "no breaking changes" release per Meta. The Expo
side has meaningful churn:

- **Legacy Architecture dropped.** We're already on
  `newArchEnabled: true` — no impact. But the `newArchEnabled` flag is
  now removed from app.json/app.config.ts — needs to come out of our
  config.
- **Xcode 26 minimum.** Confirm your local Xcode + our CI runner are
  26+ before starting.
- **Node minimum 20.19.4 / 22.13.0 / 24.3.0 / 25.0.0.** Check what our
  `.tool-versions` and CI use.
- **`notification` app.json field removed** → check our app.config.ts
  doesn't set it.
- **`expo-av` removed from Expo Go, no more patches** → we don't use it
  (confirmed).
- **`expo-video`: `allowsFullscreen` → `fullscreenOptions.enable`** →
  we use `expo-video` — grep to be sure we don't use the removed prop.
- **`experiments.autolinkingModuleResolution` now default in
  monorepos** → we're not a monorepo, safe.
- **`EXPO_USE_FAST_RESOLVER` removed** → confirmed unused in code; a
  stale entry in `~/secrets/.env` will just be a no-op.
- **`reactCanary` experiment removed** → not using.

### SDK 55 → 56 (RN 0.84 + 0.85)

Bigger surface. RN 0.84 turns Hermes V1 on by default; RN 0.85 replaces
the animation backend and ships a new Jest preset.

- **Xcode 26.4 minimum.**
- **iOS 16.4 minimum** (up from 15.1). Drops iPhone 7/7+, 6s/6s+,
  SE 1st gen, iPad mini 4, iPad Air 2. **Product decision confirmed OK
  by user.** Our current `LSMinimumSystemVersion: '12.0'` becomes moot;
  needs to bump to `16.4`.
- **TypeScript bumped to 6.0.3** (from our 5.9.3 — major version).
  Expect some new strictness / removed compiler options. `check-ts`
  will surface any issues.
- **`expo/fetch` replaces `globalThis.fetch`.** Behavior tweaks
  (WinterTC-compliant). Opt out via `EXPO_PUBLIC_USE_RN_FETCH=1` if it
  breaks something. Watch for sync/pull error handling in `terrasoApi`
  calls.
- **`expo-file-system`: `File.copy()`/`Directory.copy()`/`move()` now
  async** returning Promises; sync versions renamed
  `copySync()`/`moveSync()`. Confirmed we don't use those APIs.
- **`@expo/dom-webview` now default for DOM components.** We don't use
  DOM components — safe.
- **`expo` no longer depends on `@expo/vector-icons`.** We already list
  it explicitly (`^15.0.2`) — safe, but confirm the version needs a
  bump to a v56-tested one.
- **Known regression: reanimated + Hermes V1 = 25–30% memory
  increase** on import alone. Workaround: enable "worklets bundle
  mode" (docs). Ship the bump aware of this; monitor Sentry memory
  metrics after release.

## Dep-by-dep audit for SDK 56 / RN 0.85

| Dep | Ours | Target | Notes |
|---|---|---|---|
| `react` | 19.1.0 | 19.2.3 | Bump; safe (SDK 56 template) |
| `react-native` | 0.81.5 | 0.85.3 | Two hops (0.83 → 0.85) |
| `react-native-reanimated` | ~4.1.3 | 4.3.1 (template) | Peer requires RN 0.81-0.85, worklets 0.8.x |
| `react-native-worklets` | 0.6.1 | 0.8.3 (template) | Strict peer of reanimated — must bump together |
| `react-native-gesture-handler` | ~2.28.0 | ~2.31.1 | Minor |
| `react-native-safe-area-context` | ~5.6.1 | ~5.7.0 | Patch |
| `react-native-screens` | ~4.16.0 | ~4.26.0 | Minor |
| `@rnmapbox/maps` | ^10.2.4 | 10.3.5 latest | Peer `RN >=0.79` (fine). Our patch is a 6-line thread-safety fix in `RNMBXImageQueue.swift` — verify it still applies to 10.3.5's source. Small risk of manual re-patch. |
| `@sentry/react-native` | ~7.2.0 | 8.20.0 latest — major | Peer `RN >=0.65` (fine). Major bump — check Sentry 7→8 migration guide for breaking API changes (probably minor for our usage — we just call `Sentry.init` + `captureEvent`). |
| `@sentry/core` | ~10.12.0 | Aligned w/ react-native | Bump alongside |
| `posthog-react-native` | ^4.10.1 | 4.60.0 latest | Big jump but no RN peer pin. Check changelog for breaking public API changes |
| `posthog-react-native-session-replay` | ^1.2.1 | Latest (check) | Bump alongside posthog |
| `native-base` | ^3.4.28 (DEPRECATED) | Same | **See risk section below — biggest unknown** |
| `@reduxjs/toolkit` | ^2.9.0 | Latest 2.x | No RN dep — safe |
| `react-redux` | ^9.2.0 | Latest 9.x | No RN dep — safe |
| `formik` / `yup` / `i18next` | current | current | No RN dep — safe |
| `@react-navigation/*` | ^7.x | Latest 7.x | Bump within v7; no major-version churn |
| `@react-native-async-storage/async-storage` | 2.2.0 | 3.1.1 latest | Optional bump; RN peer `*`; check migration notes if bumping |
| `@gorhom/bottom-sheet` | ^5.2.6 | 5.2.14 latest | Peer `reanimated >=3.16 or >=4.0.0-` — fine after reanimated bump |
| `react-native-nitro-modules` | 0.36.1 | 0.36.1 | Already at vision-camera-tested version |
| `react-native-nitro-image` | 0.15.1 | 0.15.0 | Already ~aligned |
| `react-native-vision-camera` | 5.1.1 | 5.1.1 | The whole reason for the bump — becomes usable once RN is 0.85 |

### `native-base` — the flagged risk

- 168 files import `NativeBaseAdapters` (our internal wrapper), 35
  files import from `native-base` directly. Real load-bearing dep.
- Already patched with `native-base+3.4.28.patch` (116 lines) fixing
  `BackHandler.removeEventListener` (removed in RN 0.79). This tells
  us the story: **every RN bump risks removing more APIs native-base
  v3 uses, requiring more patches.**
- v3 is deprecated and unmaintained. Gluestack-ui (`@gluestack-ui/themed`
  etc.) is the vendor-recommended successor but requires a proper
  migration effort.
- **Recommendation for THIS bump: try RN 0.85 first, add patches as
  needed. Do NOT bundle the native-base migration into the SDK bump.**
  Budget for a follow-up "migrate off native-base" project if patches
  balloon or something in v3 outright refuses to compile.

## Expo tooling changes to watch

- Config plugin format: no breaking changes across 55/56 that would
  affect a single-package repo like ours (`app.config.ts` shape stable).
- `expo prebuild`: no notable behavior changes. Continue to delete
  `ios/` and `android/` between prebuilds.
- Peer deps: nothing new added to core `expo` beyond what's noted
  (vector-icons removal).
- New arch: fully stable across both hops.

## Effort + risk estimate

Realistic estimates, assuming one engineer familiar with the repo.

| Task | Est. | Risk |
|---|---|---|
| **Phase 0** — throwaway spike: `npx expo install expo@~55 --fix`, check-ts + lint, note what explodes | 2h | low |
| **Phase 1a** — SDK 54→55: run `expo install --fix`, remove `newArchEnabled`, delete `notification` if present, check node version, prebuild | 0.5 day | low |
| **Phase 1b** — reanimated 4.1→4.3 + worklets 0.6→0.8 (probably required by 55 template) | 0.5 day | medium |
| **Phase 1c** — real iOS build to device + smoke test, ship as PR | 0.5 day | low |
| **Phase 2a** — SDK 55→56: `expo install --fix`, bump iOS deployment to 16.4, TS 6 migration | 1 day | medium |
| **Phase 2b** — Sentry 7→8 migration (breaking changes review + code churn) | 0.5–1 day | medium |
| **Phase 2c** — mapbox patch re-verify on 10.3.5 (or drop if fixed upstream) | 1h | low |
| **Phase 2d** — native-base patch buffer (verify still runs, patch if needed) | 0.5–2 days | **high** — could balloon if too many APIs removed |
| **Phase 2e** — real device build + smoke test, verify Sentry / mapbox / auth still work, ship as PR | 1 day | low |
| **Phase 3** — rebase `fix/add-raw-camera-support` onto SDK 56 main, verify vision-camera crash is gone, resume phases 3 + 4 of raw-camera plan | 0.5 day + the raw-camera work itself | low |

**Realistic total for the SDK bump alone: 4–7 working days.** Add
another 4–5 for the raw-camera phases 3–4.

If native-base doesn't cooperate on RN 0.85, add **another 3–5 days
for a partial gluestack-ui migration or ejection**.

## Concrete phased plan

**Phase 0 — spike.** Throwaway branch off main. Run `npx expo install
expo@~55.0.0 --fix`. Run `check-ts`, `eslint`, `prettier`, tests. Note
every failure. Do NOT try to fix them here — just enumerate. Discard
branch. Result: a punch list for phase 1.

**Phase 1 — SDK 54→55.** New branch `chore/expo-sdk-55`. Ship as its
own PR.
- Run `npx expo install expo@~55.0.0 --fix`.
- Fix everything on the phase-0 punch list.
- Remove `newArchEnabled` from `app.config.ts`.
- Bump reanimated + worklets to SDK 55 template versions.
- Regenerate iOS/Android dirs via `npm run prebuild`.
- Do a real iOS + Android build to a physical device. Smoke-test:
  login, site list, one soil-input flow, map render, POEditor sync.
- Merge criterion: all checks green, both platforms build, both
  platforms boot and log in. Don't hunt subtle bugs here; ship and
  continue.

**Phase 2 — SDK 55→56.** New branch `chore/expo-sdk-56`. Ship as its
own PR.
- Run `npx expo install expo@~56.0.0 --fix`.
- Bump iOS deployment target to 16.4 in `app.config.ts`.
- TypeScript 6.0.3 upgrade — expect `check-ts` errors, fix them.
- Sentry 7→8 upgrade — read Sentry 8 migration guide before touching.
- Verify mapbox patch still applies to 10.3.5 — hand-verify vs the
  current `RNMBXImageQueue.swift`.
- Verify native-base still runs. Add patches as needed. If patches
  balloon beyond ~5 files or something outright fails, STOP and open a
  discussion about native-base migration as a separate project.
- Real device build + smoke test as above.

**Phase 3 — resume raw-camera work.** Rebase
`fix/add-raw-camera-support` onto main.
- `git rebase main` — expect conflicts in `package.json`,
  `package-lock.json`, maybe `patches/`.
- Rebuild, redeploy to iPhone. The vision-camera `castValue` crash
  should be gone.
- Continue with raw-camera plan phase 3 (Nitro native module + C++
  demosaic) and phase 4 (flip request to DNG).

## Risks / dealbreakers

- **`native-base` on RN 0.85** — biggest unknown. If v3 has removed-API
  surface too large to patch, we're forced into either migrating off
  it (multi-week project across 168 files) or reverting the bump.
  Recommend: try first, escalate if it fails.
- **iOS 16.4 minimum drops iPhone 7 / 6s / SE 1st gen.** Product call
  confirmed OK — we don't support those devices.
- **Sentry 7→8 is a major version.** Assume some code churn in
  `Sentry.tsx`. Worst case ~1 day; more if we've built on Sentry's
  older API surfaces we didn't notice.
- **TypeScript 6.0** — new strictness may flag latent type issues
  across the codebase. Likely 1–4 hours of chasing.
- **Xcode 26.4 minimum** — CI runner needs to be verified to match.
  Local dev machines too.
- **Reanimated + Hermes V1 memory regression (25-30%)** — known issue
  in SDK 56. Not a blocker but should enable worklets bundle mode and
  watch prod memory metrics after ship.

No hard dealbreakers found in the dep chain. Every dep has a
SDK-56-compatible version or a permissive peer. The one that could bite
is `native-base`.
