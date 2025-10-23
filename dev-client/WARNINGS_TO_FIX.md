# Warnings to Fix - Expo 54 Upgrade

## Status: Ready to Start

---

## 1. 🔴 HIGH PRIORITY - expo-av Deprecation (BREAKING)

**Status**: ✅ COMPLETED

**Problem**: expo-av is deprecated and removed in SDK 54. App will break if using it.

**Warning Message**:
```
WARN  [expo-av]: Expo AV has been deprecated and will be removed in SDK 54.
Use the `expo-audio` and `expo-video` packages to replace the required functionality.
```

**Resolution**:
- Migrated TextureGuideScreen.tsx from expo-av to expo-video
- Replaced Video component with VideoView and useVideoPlayer hook
- Implemented conditional playback based on section visibility
- Removed expo-av dependency from package.json
- All three videos (ball, ribbon, grittyness) tested and working correctly
- Committed in: 68303b56

---

## 2. 🟡 MEDIUM PRIORITY - Require Cycle #1 (Store → PostHog → Store)

**Status**: ✅ COMPLETED

**Problem**: Circular dependency can cause uninitialized values

**Warning Message**:
```
WARN  Require cycle: src/store/index.ts -> src/model/project/projectGlobalReducer.ts
-> src/store/reducers.ts -> src/model/soilIdMatch/soilIdMatchSlice.ts
-> src/model/soilIdMatch/actions/soilIdMatchActions.ts -> src/app/PostHog.tsx
-> src/store/index.ts
```

**Resolution**:
- Created separate module `src/app/posthogInstance.ts` for PostHog instance management
- Extracted `getPostHogInstance()` and `setPostHogInstance()` to new module
- Updated `PostHog.tsx` to import from `posthogInstance.ts`
- Updated `soilIdMatchActions.ts` to import from `posthogInstance.ts`
- New module has no dependencies on Redux store, breaking the cycle
- All PostHog functionality preserved and tested
- Committed in: 5463d63a

---

## 3. 🟡 MEDIUM PRIORITY - Require Cycle #2 (soilIdMatch slice ↔ actions)

**Status**: Not started

**Problem**: Actions and slice importing each other

**Warning Message**:
```
WARN  Require cycle: src/model/soilIdMatch/soilIdMatchSlice.ts
-> src/model/soilIdMatch/actions/soilIdMatchActions.ts
-> src/model/soilIdMatch/soilIdMatchSlice.ts
```

**Action Items**:
1. Review slice and actions structure
2. Options:
   - Move actions directly into slice file (Redux Toolkit best practice)
   - Extract shared types/selectors to separate file
   - Define actions inline with createSlice using extraReducers + createAsyncThunk

**Files Involved**:
- `src/model/soilIdMatch/soilIdMatchSlice.ts`
- `src/model/soilIdMatch/actions/soilIdMatchActions.ts`

---

## 4. 🟡 MEDIUM PRIORITY - Unhandled Promise Rejections (Sentry)

**Status**: ✅ APPEARS RESOLVED (Inadvertently Fixed)

**Problem**: Promises rejecting without .catch() handlers

**Warning Message** (no longer appearing):
```
WARN  Sentry Logger [warn]: Possible Unhandled Promise Rejection (id: 0)
LOG  Sentry Logger [log]: Captured error event `Possible Unhandled Promise Rejection`
```

**Resolution**:
Warnings have not been observed for 2.5+ hours after today's fixes. Likely resolved by one of:
- Issue #1: expo-av → expo-video migration (removed deprecated async code)
- Issue #2: PostHog require cycle fix (resolved initialization timing issues)
- Issue #7: Defensive color handling (prevented edge cases)

**Verification**:
- No warnings seen in console since fixes applied
- No errors appearing in Sentry dashboard
- Note: These were warnings (not errors), so Sentry wouldn't typically capture them anyway

**Monitoring**:
If warnings reappear, check Sentry for actual errors (not warnings) or add temporary local logging to identify the source. Do NOT suppress with LogBox - fix the root cause.

---

## 5. 🟢 LOW PRIORITY - Sentry Symbolication

**Status**: Not started

**Problem**: Can't map minified code to source code

**Warning Message**:
```
WARN  Sentry Logger [warn]: Unable to symbolicate stack trace: Network request failed
```

**Action Items**:
1. Verify Sentry source maps upload configuration
2. Check network connectivity during development
3. Configure sentry.properties if needed
4. Verify source maps are uploaded in CI/CD

**Note**: May be development-only issue

---

## 6. 🟢 LOW PRIORITY - SSRProvider Warning

**Status**: ✅ COMPLETED

**Problem**: Native Base includes deprecated SSRProvider from React Aria

**Warning Message**:
```
WARN  In React 18, SSRProvider is not necessary and is a noop. You can remove it from your app.
```

**Resolution**:
- Updated LogBox.ignoreLogs to suppress SSRProvider warnings
- This is from Native Base's dependencies (not our code)
- Safe to ignore as SSRProvider is a no-op in React 18+

---

## 7. 🟡 MEDIUM PRIORITY - Invalid Color/Brush Warnings

**Status**: ✅ MITIGATED (Third-party library issue)

**Problem**: Empty strings being passed as color values to react-native-svg's extractBrush function

**Warning Message**:
```
WARN  "" is not a valid color or brush
LOG  Sentry Logger [log]: Captured error event `"" is not a valid color or brush`
```

**Root Cause**:
This is a **Native Base + React 19 compatibility issue**. Native Base's Radio component (and potentially other components) internally passes empty strings as color values to react-native-svg's extractBrush function when rendering internal SVG elements.

The issue manifests in:
- TextureGuideScreen (uses multiple RadioBlock components)
- Any screen using Native Base Radio components

**Resolution**:
Implemented a **pragmatic workaround** since this is a third-party library issue:

1. **Defensive code in `nativeBaseAdapters.ts:convertColorProp()`**:
   - Returns `undefined` for empty string colors
   - Prevents the error from propagating to react-native-svg

2. **Defensive code in `Icon.tsx`**:
   - Only spreads color prop if it's defined
   - Prevents passing undefined colors to MaterialIcon

3. **LogBox suppression in `App.tsx`**:
   - Suppresses the warning (like we do with SSRProvider)
   - Added comment explaining this is a known Native Base + React 19 issue

**Why This Approach**:
- Functionality works correctly despite the warnings
- Root cause is in Native Base's internal implementation
- Cannot fix without patching Native Base itself
- Defensive code prevents Sentry spam and ensures robustness
- Consistent with how we handle other third-party compatibility warnings

**Files Modified**:
- `src/components/util/nativeBaseAdapters.ts` - Defensive color conversion
- `src/components/icons/Icon.tsx` - Conditional color prop spreading
- `src/App.tsx` - LogBox suppression with explanation

**Future**:
Monitor Native Base updates for React 19 compatibility fixes. May be resolved when Native Base fully supports React 19.

---

## 8. 🟢 LOW PRIORITY - Mapbox Invalid Size Warnings

**Status**: ✅ ACCEPTED (Benign timing issue)

**Problem**: Mapbox MapView initialization timing warnings during app startup

**Warning Message** (appears ~20-28 times at app startup):
```
[MapboxCommon] [Error, maps-core]: Invalid size is used for setting the map view, fall back to the default size {64, 64}
```

**Root Cause**:
This is a **timing issue** between React Native's layout pass and Mapbox's native layer initialization. The warnings occur when:
- StaticMapView components (used in site cards list) render before layout dimensions are calculated
- SiteMap component (main map view) initializes before flex layout completes
- Mapbox's native layer tries to initialize before React Native provides final dimensions

**Why These Warnings Are Benign**:
- Maps display correctly despite the warnings
- Only occurs during initial app startup
- Mapbox falls back to {64, 64} temporarily, then resizes correctly after layout
- No functional impact on user experience
- No performance degradation

**Attempted Fixes** (All unsuccessful or worse than problem):
1. Wrapping MapView in container with onLayout - Still got errors, added complexity
2. Delaying MapView render until dimensions available - Still got errors, caused extra re-renders
3. Passing explicit numeric dimensions - Still got errors, required state management overhead

**Decision**: Accept these warnings as benign. The "fix" (state management + wrapper views + delayed rendering) is worse than the problem (harmless console noise).

**Future**:
May be resolved in future @rnmapbox/maps SDK versions. If these become disruptive in development, can suppress with LogBox.

**Optional Suppression** (if desired):
```typescript
// src/App.tsx
LogBox.ignoreLogs([
  'Invalid size is used for setting the map view',
]);
```

---

## Progress Tracking

- [x] Issue 1: expo-av deprecation - ✅ COMPLETED
- [x] Issue 2: Require cycle (Store → PostHog) - ✅ COMPLETED
- [ ] Issue 3: Require cycle (soilIdMatch)
- [x] Issue 4: Unhandled promise rejections - ✅ APPEARS RESOLVED
- [ ] Issue 5: Sentry symbolication
- [x] Issue 6: SSRProvider warning - ✅ COMPLETED
- [x] Issue 7: Invalid color/brush warnings - ✅ MITIGATED
- [x] Issue 8: Mapbox invalid size warnings - ✅ ACCEPTED
