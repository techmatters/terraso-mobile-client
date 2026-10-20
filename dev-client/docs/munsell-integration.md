# Munsell / soil-color integration tracker

Turning the color/Munsell research spike into a clean, releasable feature.

- **Clean branch:** `fix/improved-color-determination` (off `main`) — work happens here, ships *dark* behind the experimental flag.
- **Research branch:** `feat/munsell-export-squashed` — read-only source of truth, in worktree `../terraso-munsell-research` (25 commits, ~57k LOC, 269 files).
- **Feature flag:** `src/screens/SoilScreen/ColorScreen/experimentalColorScreenToggle.ts` (+ a UserSettings menu item). Everything user-facing stays behind this until a workstream is release-ready.
- Started: 2026-10-20.

## How we work

- **No stacked PRs.** One long-lived integration branch; partial work merges to `main` safely because the flag keeps it hidden. Land in a small number of *independent* milestone PRs off `main` — never a chain where one PR waits on another unmerged one.
- **Port, don't rewrite.** Pull coherent slices from the research branch (`git checkout feat/munsell-export-squashed -- <paths>`), then split/clean/test. The research branch is never edited.
- **Every slice lands green:** `npm run check-ts`, `npm run lint`, relevant tests, `npm run format`.
- Review happens commit-by-commit in SmartGit on the main checkout dir.

## Definition of release (draft)

- [ ] Improved color determination available behind (then eventually without) the experimental flag.
- [ ] RAW capture used when supported, graceful JPEG fallback otherwise.
- [ ] Algorithm decision (primary vs average, etc.) settled and justified by the eval harness.
- [ ] At least the yellow sticky reference supported end-to-end; other ref cards scoped.
- [ ] No regression to the current (non-experimental) color flow.
- [ ] Eval tooling reproducible by another dev.

## Workstreams

Status key: ☐ todo · ◐ in progress · ☑ landed on clean branch · 🚢 merged to main

### 1. Eval tooling (scripts/CLI/docs) — *not bundled, not flag-gated*
Research paths: `scripts/` (analyze-fixtures, munsell-*-experiment, munsell-card-guide/, delta-e-analysis.py, calibrate-ref-card.mjs, render-munsell-error.ts), `tools/dng-cli*`, `docs/munsell-*`.
- ☐ Decide what graduates into the repo vs stays research-only.
- ☐ Port the keeper scripts + a short README on running the fixture eval.
- ☐ Port relevant findings docs.

### 2. RAW captures when supported (native)  — *expo bump already on main; unblocked*
Research paths: `modules/{raw-camera-android,dng-decoder,frame-analyzer}`, `tools/dng-cli*`, `docs/{android-raw-path,raw-camera-plan}.md`.
- ☐ Land native modules with prebuild/config-plugin wiring; confirm iOS + Android build in CI.
- ☐ RAW-capable detection + JPEG fallback path.
- ☐ Wire decode pipeline into analysis.

### 3. Algorithm — which color to use
Research paths: `src/screens/MunsellChartValidator/{imageOps,matchAlgorithm,gridRegistration,registration,munsellChart10YR,munsellPages}.ts`, reducers.
- ☐ Port pure algorithm modules with unit tests.
- ☐ **Open decision:** primary/dominant color vs average vs trimmed-mean — pick using the eval harness (part 1).
- ☐ Document the chosen reducer + why.

### 4. UX changes — *discuss one by one*
Research paths: `src/screens/SoilScreen/ColorScreenExperimental/*`, menu items, `ColorScreenRouter.tsx`.
- ☐ Enumerate each UX change; decide keep/cut/revise per item (separate discussion).
- ☐ Port agreed items behind the flag.

### 5. Other reference cards (beyond yellow sticky)
Research paths: `CalibrateReferenceScreen.tsx`, `ManageCustomReferencesScreen.tsx`, `munsellChart10YR.ts`, `docs/postit-yellow.md`.
- ☐ **Open decision:** fixed set of supported cards vs user-definable custom references (deferred).
- ☐ Port reference-calibration flow for the agreed scope.

## Open decisions

- Algorithm: primary vs average color (part 3).
- Reference cards: fixed vs user-defined (part 5).
- Which eval scripts/tools graduate into the repo (part 1).

## Reference: porting a slice

```
# from the clean branch (main dir)
git checkout feat/munsell-export-squashed -- <path> [<path> ...]
# then: split into a coherent commit, add/port tests, check-ts + lint + format
```
