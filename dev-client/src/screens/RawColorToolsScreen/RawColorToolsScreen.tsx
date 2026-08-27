/*
 * Copyright © 2026 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Platform, StyleSheet, TextInput} from 'react-native';
import Share from 'react-native-share';

import * as Device from 'expo-device';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import {DngDecoderHybrid} from 'dng-decoder';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {RawCameraView} from 'terraso-mobile-client/components/inputs/image/RawCameraView';
import {Select} from 'terraso-mobile-client/components/inputs/Select';
import {
  Column,
  Paragraph,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollView} from 'terraso-mobile-client/components/safeview/SafeScrollView';
import {useCustomReferences} from 'terraso-mobile-client/model/color/customReferences';
import {listAvailableReferences} from 'terraso-mobile-client/model/color/getColorFromLinearRgb';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';
import {type AnalysisMode} from 'terraso-mobile-client/screens/MunsellChartValidator/chartAnalysis';
import {CHART_GUIDE} from 'terraso-mobile-client/screens/MunsellChartValidator/chartGuide';
import {type RegistrationAlgorithm} from 'terraso-mobile-client/screens/MunsellChartValidator/matchAlgorithm';
import {MUNSELL_PAGES} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {CALIBRATE_LABELS} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/calibrateRois';

// Dev-only aggregate screen — one place for all RAW / DNG / colour-
// reference tools that used to be scattered as individual items in the
// UserSettingsScreen menu. Grouping them:
//   - Reduces menu noise in settings (dev items dominated the list).
//   - Lets the Munsell validator ask for a chart-page pick BEFORE
//     capture, which lets its RANSAC use a page-SPECIFIC ref grid
//     (universal MAX grid + wrong page = shifted-by-one fits win).
//   - Sets up an obvious spot to add a "load DNG from Files" entry
//     later without touching UserSettingsScreen again.

const CHART_PAGE_HUE_KEY = 'munsellChartValidator.selectedPageHue';
const CHART_REF_MODE_KEY = 'munsellChartValidator.selectedRefMode';
const CHART_ANALYSIS_MODE_KEY = 'munsellChartValidator.analysisMode';

// User's pre-capture pick of which existing reference is going to be
// framed in the "existing" ROI. Persisted so it doesn't reset between
// shoots — testers usually iterate on one physical card at a time.
// Stored as the AvailableReference.id ("builtin:<key>" or "custom:<uuid>").
const CALIBRATE_KNOWN_REF_ID_KEY = 'calibrate.knownRefId';

// MMKV keys for the multi-shot session context panel. See
// docs/munsell-multishot.md "Session context". These values are
// user-set metadata that gets baked into MULTI session filenames and
// session.json — none of them influence what's captured, only the
// naming and downstream analysis routing.
const SESSION_ILLUMINANT_KEY = 'munsellSession.illuminant';
const SESSION_BACKGROUND_KEY = 'munsellSession.background';
const SESSION_NOTE_KEY = 'munsellSession.note';

// Illuminant type — free-form slug baked into filenames as `light<slug>`.
// Ordered rough-warm-to-cool.
const ILLUMINANT_OPTIONS: readonly string[] = [
  'unknown',
  'tungsten',
  'led3000k',
  'led5000k',
  'shade',
  'sun',
  'cloudy',
  'canopy',
  'flash',
  'mixed',
];
const ILLUMINANT_LABEL: Record<string, string> = {
  unknown: '(unknown / skip)',
  tungsten: 'Tungsten (~3000K)',
  led3000k: 'LED warm (~3000K)',
  led5000k: 'LED daylight (~5000K)',
  shade: 'Open shade',
  sun: 'Direct sun',
  cloudy: 'Cloudy direct light',
  canopy: 'Tree canopy',
  flash: 'Flash / strobe',
  mixed: 'Mixed light',
};

// Background paper choice — baked into filename as bare token
// (`light` / `dark`) to match the existing scripts/analyze-fixtures.ts
// bg-token convention.
const BACKGROUND_OPTIONS: readonly string[] = ['unknown', 'light', 'dark'];
const BACKGROUND_LABEL: Record<string, string> = {
  unknown: '(unknown / skip)',
  light: 'Light background (white paper)',
  dark: 'Dark background',
};

// How far to run the chart analysis pipeline. Backup for when full
// analysis errors on a new device — the tester can drop back to just
// the capture (share raw files for offline inspection) or the
// registration stage (share raw + white-mask overlay).
const CHART_ANALYSIS_MODES: readonly AnalysisMode[] = [
  'capture',
  'register',
  'full',
];
const CHART_ANALYSIS_MODE_LABEL: Record<AnalysisMode, string> = {
  capture: 'Take picture only',
  register: 'Take picture + register',
  full: 'Full analysis (default)',
};

// Which reference card configuration the tester intends for this
// capture. Baked into the friendly filename so the mac parser (and
// the mac batch analyzer) can route the shot into the right pipeline.
// Values match the REFERENCE_TOKENS set in scripts/analyze-fixtures.ts.
type ChartRefMode =
  | 'nothing'
  | 'greycard'
  | 'whibal'
  | 'postit'
  | 'white'
  | 'multi';
const CHART_REF_MODES: readonly ChartRefMode[] = [
  'nothing',
  'greycard',
  'whibal',
  'postit',
  'white',
  'multi',
];
const CHART_REF_MODE_LABEL: Record<ChartRefMode, string> = {
  nothing: 'None (no card in shot)',
  greycard: 'Grey card only',
  whibal: 'WhiBal only',
  postit: 'Post-it Yellow only',
  white: 'White (printer paper) only',
  // "multi" ships all four slots on the current physical mask — the
  // analyzer's MULTI_CARD_POINTS list has been {whibal, postit,
  // greycard, white} since the 4th slot was added.
  multi: 'All four (whibal / postit / greycard / white)',
};

// Pick 'raw' for .dng and 'photo' for common photo formats; null for
// anything else (we bail on unsupported extensions). Case-insensitive.
const detectFormatFromName = (name: string): 'raw' | 'photo' | null => {
  const lower = name.toLowerCase();
  if (lower.endsWith('.dng')) return 'raw';
  if (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.heic') ||
    lower.endsWith('.heif') ||
    lower.endsWith('.png')
  ) {
    return 'photo';
  }
  return null;
};

// Which capture flow the RawCameraView modal (mounted once at the
// bottom of this screen) is currently servicing. Non-null while the
// modal is open; used by onCapture to route the resulting DNG or
// JPEG to the right downstream screen.
type CaptureFlow =
  | {kind: 'raw-jpeg'} // dev: capture DNG + JPEG, pop the share sheet
  | {kind: 'calibrate'; knownRefId: string}
  | {
      kind: 'chart';
      pageHue: string;
      refMode: ChartRefMode;
      algorithm: RegistrationAlgorithm;
      analysisMode: AnalysisMode;
    };

// Timestamp for chart-capture filenames — yyyymmddThhmmss (seconds
// resolution to avoid overwrite if the tester captures twice in a
// minute; user-facing spec only showed minutes but seconds is a
// safer default).
const yyyymmddThhmmss = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
};

// Slugify Device.modelName the same way the Android native
// CameraSessionManager does (Build.MODEL → lowercase alnum), so the
// mac analyzer's DEVICE_SLUG_PREFIXES matcher recognises iOS files
// the same way it recognises Android ones. Falls back to a generic
// per-platform token if expo-device can't tell us the model.
const deviceSlug = (): string => {
  const raw = Device.modelName?.trim() ?? '';
  const slug = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (slug) return slug;
  return Platform.OS === 'android' ? 'unknownandroid' : 'unknownios';
};

// Friendly filename stem for a chart / raw-jpeg capture.
//
//   "{device}_{page}_{bg}_ref{refCard}_light{illuminant}_[BOTH_]{PLATFORM}_{ts}"
//
// The tokens between {device} and {PLATFORM} match the enriched
// session format the Android MULTI session emits (see Kotlin
// buildSessionShotStem + buildSessionContextTokens). Every context
// token that MMKV knows about is included, so a single DNG+JPEG
// capture carries the same page/bg/refCard/illuminant metadata a
// multi session would — which is what the analyzer keys off to
// decide "does this shot have taped ref cards, and where are they"
// without needing the user to remember to name the file by hand.
//
// - {device}: Device.modelName slugified — 'iphone15promax',
//   'pixel7', etc. Analyzer's DEVICE_SLUG_PREFIXES parser picks it
//   up (iphone/pixel/samsung/oneplus).
// - {page}: verbatim ('10YR', '7.5YR', 'GLEY1'). Munsell page
//   names are already filesystem-safe.
// - "{bg}" (literal, no prefix — matches Android session format's
//   ILLUMINANT_TOKENS parse: 'dark' / 'light' land verbatim) /
//   "ref{refCard}" / "light{illuminant}": each token only emitted
//   when the corresponding MMKV field is set to a non-'unknown' /
//   non-'nothing' value.
// - "BOTH": DNG has an ISP-processed JPEG companion. Dropped when
//   the caller doesn't have a paired JPEG.
// - {PLATFORM} = "IOS" or "ANDROID". Routes the mac analyzer's
//   decoder choice (dng-cli vs dng-cli-cpp) per the same-code-path
//   invariant — the CLI that runs on the mac must be the same one
//   that decodes on-device for that platform.
const friendlyStemForCapture = (
  context: MultishotSessionContext,
  hasJpeg: boolean,
  when: Date,
): string => {
  const platform = Platform.OS === 'android' ? 'ANDROID' : 'IOS';
  const parts: string[] = [deviceSlug()];
  if (context.page) parts.push(context.page);
  if (context.background) parts.push(sanitizeToken(context.background));
  if (context.refCard) parts.push(`ref${sanitizeToken(context.refCard)}`);
  if (context.illuminant) {
    parts.push(`light${sanitizeToken(context.illuminant)}`);
  }
  if (hasJpeg) parts.push('BOTH');
  parts.push(platform);
  parts.push(yyyymmddThhmmss(when));
  return parts.join('_');
};

// Match Kotlin sanitizeToken: keep A-Z0-9 (and dot), drop everything
// else. Same rule so a shared "sun" or "5YR" token slugifies to the
// same on-disk chars whether it originated on iOS or Android.
const sanitizeToken = (s: string): string =>
  s.trim().replace(/[^A-Za-z0-9.]/g, '');

// Rename a DNG (+ optional sibling JPEG) to a friendly stem.
// Returns the new file:// URIs.
//
// Copies (not moves) into cacheDirectory rather than renaming in
// place. The obvious in-place moveAsync fails on iOS SDK 54 with
// "FileNotWritableException" against the source file's parent —
// vision-camera writes the temp DNG/JPEG under Application/tmp/ and
// expo-file-system/legacy refuses to move within that dir even
// though it originally wrote there. copyAsync to cacheDirectory
// works reliably (same code path prepareFriendlyShare already uses
// downstream), and the extra bytes are cheap next to the DNG
// decode we're about to do anyway.
//
// Best-effort delete of any prior copy under the friendly name so
// re-captures within the same second overwrite cleanly. Failure of
// that delete is swallowed — {idempotent: true} is supposed to make
// it a no-op on missing targets but legacy still throws.
const renamePairToFriendlyStem = async (
  dngPath: string,
  jpegPath: string | undefined,
  friendlyStem: string,
): Promise<{dngPath: string; jpegPath: string | undefined}> => {
  const cache = FileSystem.cacheDirectory;
  if (!cache) {
    throw new Error('renamePairToFriendlyStem: cacheDirectory unavailable');
  }
  const bestEffortDelete = async (uri: string): Promise<void> => {
    try {
      await FileSystem.deleteAsync(uri, {idempotent: true});
    } catch {
      /* missing target or legacy quirk — copy below will overwrite */
    }
  };
  const newDng = `${cache}${friendlyStem}.dng`;
  await bestEffortDelete(newDng);
  await FileSystem.copyAsync({from: dngPath, to: newDng});
  let newJpeg: string | undefined;
  if (jpegPath) {
    newJpeg = `${cache}${friendlyStem}.jpg`;
    await bestEffortDelete(newJpeg);
    await FileSystem.copyAsync({from: jpegPath, to: newJpeg});
  }
  return {dngPath: newDng, jpegPath: newJpeg};
};

export const RawColorToolsScreen = () => {
  const navigation = useNavigation();
  const [pageHue, setPageHueState] = useState<string>(() => {
    const persisted = kvStorage.getString(CHART_PAGE_HUE_KEY);
    if (persisted && MUNSELL_PAGES.some(p => p.name === persisted)) {
      return persisted;
    }
    // Persist the picker's shown default on first-run so consumers
    // that read MMKV directly (e.g. the MULTI shutter via
    // getMultishotSessionContext) see the same value as the picker.
    // Without this, MULTI captures pre-first-touch produce filenames
    // with no page token → analyzer rejects them.
    kvStorage.setString(CHART_PAGE_HUE_KEY, MUNSELL_PAGES[0].name);
    return MUNSELL_PAGES[0].name;
  });
  const setPageHue = useCallback((hue: string) => {
    kvStorage.setString(CHART_PAGE_HUE_KEY, hue);
    setPageHueState(hue);
  }, []);
  const [refMode, setRefModeState] = useState<ChartRefMode>(() => {
    const persisted = kvStorage.getString(CHART_REF_MODE_KEY);
    if (
      persisted &&
      (CHART_REF_MODES as readonly string[]).includes(persisted)
    ) {
      return persisted as ChartRefMode;
    }
    return 'nothing';
  });
  const setRefMode = useCallback((mode: ChartRefMode) => {
    kvStorage.setString(CHART_REF_MODE_KEY, mode);
    setRefModeState(mode);
  }, []);
  const [analysisMode, setAnalysisModeState] = useState<AnalysisMode>(() => {
    const persisted = kvStorage.getString(CHART_ANALYSIS_MODE_KEY);
    if (
      persisted &&
      (CHART_ANALYSIS_MODES as readonly string[]).includes(persisted)
    ) {
      return persisted as AnalysisMode;
    }
    return 'full';
  });
  const setAnalysisMode = useCallback((mode: AnalysisMode) => {
    kvStorage.setString(CHART_ANALYSIS_MODE_KEY, mode);
    setAnalysisModeState(mode);
  }, []);
  // Session-context fields for the MULTI research flow. All optional
  // (the on-device capture works whether these are set or not).
  // Setting them bakes tokens into filenames + populates session.json.
  // Persisted so the tester doesn't re-enter the same context across
  // consecutive shoots of the same setup.
  const [illuminant, setIlluminantState] = useState<string>(() => {
    const v = kvStorage.getString(SESSION_ILLUMINANT_KEY);
    return v && ILLUMINANT_OPTIONS.includes(v) ? v : 'unknown';
  });
  const setIlluminant = useCallback((v: string) => {
    kvStorage.setString(SESSION_ILLUMINANT_KEY, v);
    setIlluminantState(v);
  }, []);
  const [backgroundKind, setBackgroundKindState] = useState<string>(() => {
    const v = kvStorage.getString(SESSION_BACKGROUND_KEY);
    return v && BACKGROUND_OPTIONS.includes(v) ? v : 'unknown';
  });
  const setBackgroundKind = useCallback((v: string) => {
    kvStorage.setString(SESSION_BACKGROUND_KEY, v);
    setBackgroundKindState(v);
  }, []);
  const [note, setNoteState] = useState<string>(
    () => kvStorage.getString(SESSION_NOTE_KEY) ?? '',
  );
  const setNote = useCallback((v: string) => {
    kvStorage.setString(SESSION_NOTE_KEY, v);
    setNoteState(v);
  }, []);
  // Directed-quadrant is now the only supported registration
  // algorithm — the constrained-random path is retained in the code
  // (matchAlgorithm.ts still exports both and the CaptureFlow /
  // MunsellChartValidator plumbing still threads the choice through)
  // but no longer surfaced in the UI. Dead-code cleanup is deferred.
  const algorithm: RegistrationAlgorithm = 'directed-quadrant';
  // Available references for the calibrate flow's "known reference"
  // dropdown — builtins first, then custom (in creation order). Also
  // used to validate the persisted knownRefId on load.
  const customRefs = useCustomReferences();
  const availableRefs = useMemo(
    () => listAvailableReferences(customRefs),
    [customRefs],
  );
  const [knownRefId, setKnownRefIdState] = useState<string>(() => {
    const persisted = kvStorage.getString(CALIBRATE_KNOWN_REF_ID_KEY);
    if (persisted != null) return persisted;
    // Default to the first available (a builtin). Custom refs come
    // after, so on a fresh install this is a stable known-good.
    return availableRefs[0]?.id ?? '';
  });
  // If the persisted ID no longer resolves (custom ref deleted since
  // last calibrate), fall back to the first available. Kept as an
  // effect so a deletion from ManageCustomReferences flows through.
  useEffect(() => {
    if (availableRefs.length === 0) return;
    if (availableRefs.some(r => r.id === knownRefId)) return;
    setKnownRefIdState(availableRefs[0].id);
    kvStorage.setString(CALIBRATE_KNOWN_REF_ID_KEY, availableRefs[0].id);
  }, [availableRefs, knownRefId]);
  const setKnownRefId = useCallback((id: string) => {
    kvStorage.setString(CALIBRATE_KNOWN_REF_ID_KEY, id);
    setKnownRefIdState(id);
  }, []);
  const [captureFlow, setCaptureFlow] = useState<CaptureFlow | null>(null);
  // URLs the raw-jpeg flow wants to share, stashed at onCapture time
  // and consumed by onCameraDismiss after the modal-dismiss animation
  // completes. Ref so writes don't trigger renders.
  const pendingShareUrlsRef = useRef<string[] | null>(null);
  const cancelCapture = useCallback(() => setCaptureFlow(null), []);

  // RAW+JPEG capture handoff: pops the share sheet with BOTH the DNG
  // and its companion JPEG so the tester can AirDrop the pair to a
  // desktop for side-by-side analysis. Also decodes a centred ROI
  // from the DNG as an end-to-end pipeline sanity check.
  const handleRawJpegCapture = useCallback(async (result: CaptureResult) => {
    if (result.kind !== 'raw') {
      console.warn(
        'RawColorToolsScreen: RAW+JPEG expected raw capture, got',
        result.kind,
      );
      return;
    }
    try {
      const roi = {x: 1500, y: 1000, w: 1000, h: 1000};
      const [rgb] = await DngDecoderHybrid.decodeDngRois(result.dngPath, [roi]);
      console.log(
        `DngDecoder: ROI ${roi.x},${roi.y} ${roi.w}x${roi.h} → linear sRGB (` +
          `r=${rgb.r.toFixed(4)}, g=${rgb.g.toFixed(4)}, b=${rgb.b.toFixed(4)})`,
      );
    } catch (err) {
      console.error('DngDecoder.decodeDngRois failed:', err);
    }
    // Rename the vision-camera UUID temp files (F2BEDD...dng/.jpg) to
    // a self-describing stem carrying the current session context —
    // page, background, ref card, illuminant, device, timestamp. The
    // analyzer keys off these tokens to decide "does this shot have
    // taped ref cards, and where", so a filename that only says
    // "F2BEDD.dng" analyzes as a bare capture with no ref cards even
    // when the user had all four taped. Best-effort — if rename
    // fails, fall through to the UUID names so the share still works.
    let dngPath = result.dngPath;
    let jpegPath = result.jpegPath;
    try {
      const stem = friendlyStemForCapture(
        getMultishotSessionContext(),
        jpegPath != null,
        new Date(),
      );
      const renamed = await renamePairToFriendlyStem(dngPath, jpegPath, stem);
      dngPath = renamed.dngPath;
      jpegPath = renamed.jpegPath;
    } catch (err) {
      console.warn(
        'RawColorToolsScreen: RAW+JPEG friendly-rename failed, ' +
          'falling back to vision-camera temp names',
        err,
      );
    }
    const urls = [dngPath, ...(jpegPath ? [jpegPath] : [])];
    console.log(
      `RAW+JPEG share: ${urls.length} file(s)\n` +
        `  dng: ${dngPath}\n` +
        `  jpg: ${jpegPath ?? '(missing — camera bind may have dropped JPEG)'}`,
    );
    // Deferred to the RawCameraView modal's onDismiss (see below) —
    // UIKit refuses to present a new modal while the previous one is
    // still animating away, and its onDismiss fires exactly when the
    // presenting VC is gone. We just stash the URLs here.
    pendingShareUrlsRef.current = urls;
  }, []);

  // Fires from RawCameraView after the iOS modal-dismiss animation
  // completes. When there's a pending raw-jpeg share, open the sheet
  // now — UIKit is free to present. No `type` field: iOS uses UTIs
  // (public.dng, public.jpeg) and derives them from the file
  // extensions; passing "*/*" makes react-native-share hand a bogus
  // MIME to UIActivityViewController which silently drops the whole
  // activity list on some iOS versions.
  const onCameraDismiss = useCallback(() => {
    const urls = pendingShareUrlsRef.current;
    if (!urls) return;
    pendingShareUrlsRef.current = null;
    (async () => {
      try {
        await Share.open({
          urls,
          subject: 'RAW + JPEG capture',
          failOnCancel: false,
        });
      } catch (err) {
        console.error('RawColorToolsScreen: RAW+JPEG share failed', err);
      }
    })();
  }, []);

  const onCapture = useCallback(
    (result: CaptureResult) => {
      const flow = captureFlow;
      setCaptureFlow(null);
      if (!flow) return;
      if (flow.kind === 'calibrate' || flow.kind === 'raw-jpeg') {
        // Both require a RAW result. Calibrate navigates onward;
        // raw-jpeg shares the DNG + companion JPEG via the OS share
        // sheet and stays on this screen.
        if (result.kind !== 'raw') {
          console.warn(
            'RawColorToolsScreen: expected raw capture for',
            flow.kind,
            'got',
            result.kind,
          );
          return;
        }
        if (flow.kind === 'calibrate') {
          navigation.navigate('CALIBRATE_REFERENCE_EXPERIMENTAL', {
            dngPath: result.dngPath,
            sensorWidth: result.width,
            sensorHeight: result.height,
            knownRefId: flow.knownRefId,
          });
        } else {
          handleRawJpegCapture(result);
        }
      } else if (flow.kind === 'chart') {
        // Chart always captures DNG; the companion JPEG (Apple ISP's
        // processed preview embedded in the DNG) is extracted in
        // RawCameraView and passed through as jpegPath so the mac
        // batch report can A/B both pipelines from a single shutter.
        // The phone-side validator only analyses the DNG.
        if (result.kind !== 'raw') {
          console.warn(
            'RawColorToolsScreen: chart capture expected RAW, got',
            result.kind,
          );
          return;
        }
        // Rename the vision-camera temp files (mrousavyXXXX.dng/.jpg)
        // to a self-describing stem carrying page/bg/refCard/
        // illuminant/device/timestamp — same tokens the Android MULTI
        // session bakes into its filenames, so the mac analyzer
        // routes the shot through the same pipeline regardless of
        // origin. Best-effort — if rename fails, fall back to the
        // vision-camera-generated names so capture still completes.
        (async () => {
          let dngPath = result.dngPath;
          let jpegPath = result.jpegPath;
          try {
            const stem = friendlyStemForCapture(
              getMultishotSessionContext(),
              jpegPath != null,
              new Date(),
            );
            const renamed = await renamePairToFriendlyStem(
              dngPath,
              jpegPath,
              stem,
            );
            dngPath = renamed.dngPath;
            jpegPath = renamed.jpegPath;
            console.log(
              `chart capture friendly-rename → stem="${stem}"\n` +
                `  dng: ${dngPath}\n` +
                `  jpg: ${jpegPath ?? '(none)'}`,
            );
          } catch (err) {
            console.warn(
              'RawColorToolsScreen: friendly-rename failed, ' +
                'falling back to vision-camera temp names',
              err,
            );
          }
          navigation.navigate('MUNSELL_CHART_VALIDATOR', {
            dngPath,
            jpegPath,
            pageHue: flow.pageHue,
            refMode: flow.refMode,
            algorithm: flow.algorithm,
            analysisMode: flow.analysisMode,
          });
        })();
      }
    },
    [navigation, captureFlow, handleRawJpegCapture],
  );

  // The RawCameraView is a Modal — mount it always with visible driven
  // by captureFlow. Its containerFormat and any per-flow prop set (like
  // the chart-guide overlay) depends on which flow requested it.
  const cameraVisible = captureFlow !== null;

  return (
    <ScreenScaffold AppBar={<AppBar title="RAW & color tools" />}>
      <SafeScrollView>
        <Column padding="md" space="md">
          <Paragraph>
            Experimental RAW-DNG based colour capture, plus dev tools around
            reference calibration and the Munsell chart validator.
          </Paragraph>

          <Text variant="body1" bold>
            RAW + JPEG capture
          </Text>
          <Paragraph>
            Take a DNG plus its HAL-processed companion JPEG, then open the
            share sheet with both files (AirDrop, Files, Google Drive, etc.).
          </Paragraph>
          <ContainedButton
            label="Capture RAW+JPEG"
            onPress={() => setCaptureFlow({kind: 'raw-jpeg'})}
          />

          <Text variant="body1" bold>
            References
          </Text>
          <Paragraph>
            Calibrate a new custom colour reference from a card, or review /
            delete existing ones. Pick which existing card you'll be framing in
            the "existing" ROI before capture — the ranked auto-pick wasn't
            reliable enough.
          </Paragraph>
          <Select<string, false>
            nullable={false}
            options={availableRefs.map(r => r.id)}
            value={knownRefId}
            onValueChange={setKnownRefId}
            renderValue={id => {
              const r = availableRefs.find(x => x.id === id);
              if (!r) return id;
              const suffix = r.source === 'custom' ? ' (custom)' : '';
              return `${r.name}${suffix}`;
            }}
            label="Existing reference to calibrate against"
          />
          <ContainedButton
            label="Calibrate reference…"
            onPress={() => setCaptureFlow({kind: 'calibrate', knownRefId})}
            disabled={!knownRefId}
          />
          <ContainedButton
            label="Manage custom references"
            onPress={() =>
              navigation.navigate('MANAGE_CUSTOM_REFERENCES_EXPERIMENTAL')
            }
          />

          <Text variant="body1" bold>
            Munsell chart validator
          </Text>
          <Paragraph>
            Compare a DNG of a Munsell soil-colour page to the published values,
            cell by cell. Pick the page BEFORE capture so the registration knows
            the exact chip layout.
          </Paragraph>
          <Select<string, false>
            nullable={false}
            options={MUNSELL_PAGES.map(p => p.name)}
            value={pageHue}
            onValueChange={setPageHue}
            renderValue={hue => `Munsell ${hue} page`}
            label="Chart page"
          />
          <Select<ChartRefMode, false>
            nullable={false}
            options={CHART_REF_MODES}
            value={refMode}
            onValueChange={setRefMode}
            renderValue={mode => CHART_REF_MODE_LABEL[mode]}
            label="Reference cards in the shot"
          />
          <Text variant="body1" bold>
            Session context (MULTI research capture)
          </Text>
          <Paragraph>
            Metadata baked into filenames + session.json when you use the MULTI
            shutter. Doesn't affect what gets captured. Persists across sessions
            — set once per setup and forget.
          </Paragraph>
          <Select<string, false>
            nullable={false}
            options={BACKGROUND_OPTIONS}
            value={backgroundKind}
            onValueChange={setBackgroundKind}
            renderValue={v => BACKGROUND_LABEL[v] ?? v}
            label="Background paper"
          />
          <Select<string, false>
            nullable={false}
            options={ILLUMINANT_OPTIONS}
            value={illuminant}
            onValueChange={setIlluminant}
            renderValue={v => ILLUMINANT_LABEL[v] ?? v}
            label="Illuminant type"
          />
          {/*
           * Note field is a plain multiline text input; when non-empty
           * it's written as note.txt in the session dir + included in
           * session.json. Kept simple — no persistence unusualness,
           * just a session-level annotation.
           */}
          <SessionNoteInput value={note} onChange={setNote} />
          <Select<AnalysisMode, false>
            nullable={false}
            options={CHART_ANALYSIS_MODES}
            value={analysisMode}
            onValueChange={setAnalysisMode}
            renderValue={mode => CHART_ANALYSIS_MODE_LABEL[mode]}
            label="Analysis depth"
          />
          <ContainedButton
            label="Capture (DNG + JPEG)"
            onPress={() =>
              setCaptureFlow({
                kind: 'chart',
                pageHue,
                refMode,
                algorithm,
                analysisMode,
              })
            }
          />
          <ContainedButton
            label="Load from file…"
            onPress={async () => {
              // Wildcard type + extension detection: DNGs are labelled
              // with various UTIs depending on source app, and photos
              // are labelled with their own set. Filter by extension
              // so Files' picker offers everything and we route based
              // on what the user actually picked.
              const res = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
                multiple: false,
              });
              if (res.canceled) return;
              const asset = res.assets?.[0];
              if (!asset) return;
              const format = detectFormatFromName(asset.name);
              if (!format) {
                console.warn(
                  'RawColorToolsScreen: unsupported file extension',
                  asset.name,
                );
                return;
              }
              const path = asset.uri.startsWith('file://')
                ? asset.uri
                : `file://${asset.uri}`;
              // File extension tells us which pipeline the validator
              // should default to. Loaded files never come as pairs,
              // so exactly one of the two path props is set.
              navigation.navigate('MUNSELL_CHART_VALIDATOR', {
                dngPath: format === 'raw' ? path : undefined,
                jpegPath: format === 'photo' ? path : undefined,
                pageHue,
                algorithm,
                analysisMode,
              });
            }}
          />
          <ContainedButton
            label="Load from photos…"
            onPress={async () => {
              // Photos always come through as JPEG/HEIC from the
              // Photos library (iOS auto-converts RAW to JPEG at pick
              // time, so DNG-from-Photos isn't possible via this
              // path — use Load from file for DNGs).
              const perm =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!perm.granted) {
                console.warn(
                  'RawColorToolsScreen: photo library permission denied',
                );
                return;
              }
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: false,
                exif: false,
              });
              if (res.canceled) return;
              const asset = res.assets?.[0];
              if (!asset) return;
              const path = asset.uri.startsWith('file://')
                ? asset.uri
                : `file://${asset.uri}`;
              navigation.navigate('MUNSELL_CHART_VALIDATOR', {
                jpegPath: path,
                pageHue,
                algorithm,
                analysisMode,
              });
            }}
          />
        </Column>
      </SafeScrollView>
      <RawCameraView
        visible={cameraVisible}
        // All three flows capture RAW; chart + raw-jpeg additionally
        // want the HAL-processed companion JPEG (chart for its A/B
        // report, raw-jpeg for its share sheet).
        containerFormat="dng"
        onCancel={cancelCapture}
        onCapture={onCapture}
        // Fires on iOS after the modal-dismiss animation completes.
        // raw-jpeg uses this to defer Share.open until UIKit has torn
        // down the presenting VC — see onCameraDismiss.
        onDismiss={onCameraDismiss}
        chartGuide={captureFlow?.kind === 'chart' ? CHART_GUIDE : undefined}
        captureHint={
          captureFlow?.kind === 'calibrate'
            ? 'Frame the EXISTING card inside the top box and the NEW card inside the bottom box.'
            : undefined
        }
        roiHint={
          captureFlow?.kind === 'calibrate'
            ? {labels: CALIBRATE_LABELS}
            : undefined
        }
        // Calibrate drops the JPEG (only needs the DNG) so the native
        // side takes one takePicture instead of two. Chart + raw-jpeg
        // keep it — the JPEG companion is the whole point of both.
        skipJpeg={captureFlow?.kind === 'calibrate'}
        // Chart + raw-jpeg also want JPEG at bind time: on constrained
        // devices where the 4-stream bind fails, keep JPEG and drop
        // the live variance analyser (neither flow uses the on-screen
        // evenness feedback). Calibrate leaves preferJpeg default so
        // the analyser survives the fallback.
        preferJpeg={
          captureFlow?.kind === 'chart' || captureFlow?.kind === 'raw-jpeg'
        }
        // Grab-and-share flow: strip the ROI overlay + +/- size
        // buttons so the tester sees a plain camera + shutter,
        // independent of the shared ROI preset MMKV state that
        // other flows write into.
        simpleShutter={captureFlow?.kind === 'raw-jpeg'}
      />
    </ScreenScaffold>
  );
};

// Snapshot of the user-set session context, read from the MMKV keys
// this screen writes. Callers OUTSIDE this component (like the
// AndroidRawCaptureScreen MULTI shutter) use this to bake the same
// tokens into filenames without needing to re-derive them.
//
// Also uses the chart-page + ref-mode fields already persisted at the
// top of this file, so the session context ends up with every user-
// visible field on the RawColorToolsScreen.
export type MultishotSessionContext = {
  page?: string;
  background?: string;
  refCard?: string;
  illuminant?: string;
  note?: string;
};

// Read the currently-persisted session context. Fields not set (blank
// / 'unknown' / 'nothing') come back undefined so the native side's
// filename builder can skip them cleanly rather than emit "unknown"
// tokens.
export const getMultishotSessionContext = (): MultishotSessionContext => {
  const norm = (v: string | undefined, unset: readonly string[]) =>
    v && !unset.includes(v) ? v : undefined;
  // Page: fall back to MUNSELL_PAGES[0].name if MMKV is empty. This
  // matches what the picker's useState initializer displays as its
  // default, ensuring the analyzer always sees a valid page token
  // even for a fresh install that never touched the picker.
  const persistedPage = kvStorage.getString(CHART_PAGE_HUE_KEY);
  const page =
    persistedPage && MUNSELL_PAGES.some(p => p.name === persistedPage)
      ? persistedPage
      : MUNSELL_PAGES[0].name;
  const bg = norm(kvStorage.getString(SESSION_BACKGROUND_KEY), ['unknown']);
  const ref = norm(kvStorage.getString(CHART_REF_MODE_KEY), ['nothing']);
  const light = norm(kvStorage.getString(SESSION_ILLUMINANT_KEY), ['unknown']);
  const note = kvStorage.getString(SESSION_NOTE_KEY)?.trim();
  return {
    page,
    background: bg,
    refCard: ref,
    illuminant: light,
    note: note ? note : undefined,
  };
};

// Small helper component: a labelled multi-line text input, wired to
// the parent's session-note MMKV state. Kept inline in this file
// because it's the only consumer and doesn't warrant its own module.
const SessionNoteInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => (
  <>
    <Text variant="body1">Session note (optional)</Text>
    <TextInput
      style={sessionNoteStyles.input}
      value={value}
      onChangeText={onChange}
      placeholder="Free-form note written to session dir's note.txt"
      multiline
      numberOfLines={2}
    />
  </>
);

const sessionNoteStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 6,
    minHeight: 44,
    fontSize: 13,
    textAlignVertical: 'top',
  },
});
