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

import {useCallback, useState} from 'react';
import {Platform, StyleSheet, TextInput} from 'react-native';
import Share from 'react-native-share';

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
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';
import {type AnalysisMode} from 'terraso-mobile-client/screens/MunsellChartValidator/chartAnalysis';
import {CHART_GUIDE} from 'terraso-mobile-client/screens/MunsellChartValidator/chartGuide';
import {type RegistrationAlgorithm} from 'terraso-mobile-client/screens/MunsellChartValidator/matchAlgorithm';
import {MUNSELL_PAGES} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

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
type ChartRefMode = 'nothing' | 'greycard' | 'whibal' | 'postit' | 'multi';
const CHART_REF_MODES: readonly ChartRefMode[] = [
  'nothing',
  'greycard',
  'whibal',
  'postit',
  'multi',
];
const CHART_REF_MODE_LABEL: Record<ChartRefMode, string> = {
  nothing: 'None (no card in shot)',
  greycard: 'Grey card only',
  whibal: 'WhiBal only',
  postit: 'Post-it Yellow only',
  multi: 'All three (whibal / postit / greycard)',
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
  | {kind: 'fixture'} // dev: log to Metro + share sheet
  | {kind: 'calibrate'}
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

// Friendly filename stem for a chart capture:
//   "{page}_{refMode}_[BOTH_]{PLATFORM}_{ts}"
// - {refMode} matches REFERENCE_TOKENS in scripts/analyze-fixtures.ts
//   ('nothing' / 'greycard' / 'whibal' / 'postit' / 'multi') so the
//   mac parser knows which pipeline to route the shot into without
//   requiring a rename step.
// - "BOTH" flags that the DNG has its ISP-processed JPEG companion
//   alongside. Included only when hasJpeg=true; dropped otherwise so
//   the token isn't misleading.
// - {PLATFORM} = "IOS" or "ANDROID". Analyze-fixtures reads this to
//   route through the platform-matching decoder CLI (dng-cli for
//   iOS, dng-cli-cpp for Android) — the same-code-path invariant
//   requires the mac's analysis to use the same decoder that runs
//   on-device for that platform.
// - Page name is used verbatim; Munsell page names are already
//   filesystem-safe ("10YR", "7.5YR", "GLEY1", "10Y-5GY").
const friendlyStemForChartCapture = (
  pageHue: string,
  refMode: ChartRefMode,
  hasJpeg: boolean,
  when: Date,
): string => {
  const platform = Platform.OS === 'android' ? 'ANDROID' : 'IOS';
  const bothToken = hasJpeg ? 'BOTH_' : '';
  return `${pageHue}_${refMode}_${bothToken}${platform}_${yyyymmddThhmmss(when)}`;
};

// Rename a DNG (+ optional sibling JPEG) to a friendly stem in the
// same directory. Returns the new file:// URIs. Uses moveAsync so
// no bytes are copied — cheap. Any prior file at the destination is
// removed first so moveAsync doesn't error on a same-minute rename.
const renamePairToFriendlyStem = async (
  dngPath: string,
  jpegPath: string | undefined,
  friendlyStem: string,
): Promise<{dngPath: string; jpegPath: string | undefined}> => {
  const withoutScheme = (p: string) =>
    p.startsWith('file://') ? p.slice('file://'.length) : p;
  const dirOf = (p: string) => p.slice(0, p.lastIndexOf('/'));
  const dir = dirOf(withoutScheme(dngPath));
  const newDng = `file://${dir}/${friendlyStem}.dng`;
  await FileSystem.deleteAsync(newDng, {idempotent: true});
  await FileSystem.moveAsync({from: dngPath, to: newDng});
  let newJpeg: string | undefined;
  if (jpegPath) {
    newJpeg = `file://${dir}/${friendlyStem}.jpg`;
    await FileSystem.deleteAsync(newJpeg, {idempotent: true});
    await FileSystem.moveAsync({from: jpegPath, to: newJpeg});
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
  const [captureFlow, setCaptureFlow] = useState<CaptureFlow | null>(null);
  const cancelCapture = useCallback(() => setCaptureFlow(null), []);

  // Fixture-capture handoff: decode a centred ROI to check the pipeline
  // end-to-end and pop the share sheet so the tester can AirDrop the
  // DNG off-device for offline inspection. Same behaviour the retired
  // CaptureRawFixtureItem had.
  const handleFixtureCapture = useCallback(async (uri: string) => {
    try {
      const roi = {x: 1500, y: 1000, w: 1000, h: 1000};
      const [rgb] = await DngDecoderHybrid.decodeDngRois(uri, [roi]);
      console.log(
        `DngDecoder: ROI ${roi.x},${roi.y} ${roi.w}x${roi.h} → linear sRGB (` +
          `r=${rgb.r.toFixed(4)}, g=${rgb.g.toFixed(4)}, b=${rgb.b.toFixed(4)})`,
      );
    } catch (err) {
      console.error('DngDecoder.decodeDngRois failed:', err);
    }
    try {
      await Share.open({
        url: uri,
        type: 'image/x-adobe-dng',
        failOnCancel: false,
      });
    } catch (err) {
      console.error('RawColorToolsScreen: fixture share failed', err);
    }
  }, []);

  const onCapture = useCallback(
    (result: CaptureResult) => {
      const flow = captureFlow;
      setCaptureFlow(null);
      if (!flow) return;
      if (flow.kind === 'calibrate' || flow.kind === 'fixture') {
        // Calibrate & fixture both require RAW; fixture is handled
        // by onRawPhotoDevOnly (no nav here).
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
          });
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
        // to something a mac tester can identify at a glance after
        // AirDrop: "10YR_BOTH_IOS_20260808T134502.dng" carries page,
        // capture mode, source device, and timestamp. Best-effort —
        // if the rename fails for any reason, we fall back to the
        // vision-camera-generated names so capture still completes.
        (async () => {
          let dngPath = result.dngPath;
          let jpegPath = result.jpegPath;
          try {
            const stem = friendlyStemForChartCapture(
              flow.pageHue,
              flow.refMode,
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
    [navigation, captureFlow],
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
            RAW fixture capture
          </Text>
          <Paragraph>
            Take a DNG, log the centre ROI's linear-sRGB to Metro, and AirDrop /
            share the raw file for offline inspection.
          </Paragraph>
          <ContainedButton
            label="Capture RAW fixture"
            onPress={() => setCaptureFlow({kind: 'fixture'})}
          />

          <Text variant="body1" bold>
            References
          </Text>
          <Paragraph>
            Calibrate a new custom colour reference from a card, or review /
            delete existing ones.
          </Paragraph>
          <ContainedButton
            label="Calibrate reference…"
            onPress={() => setCaptureFlow({kind: 'calibrate'})}
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
        // Chart, calibrate, and fixture flows all capture RAW now —
        // chart because the DNG carries its embedded JPEG preview
        // through as a companion for the JPEG pipeline.
        containerFormat="dng"
        onCancel={cancelCapture}
        onCapture={onCapture}
        onRawPhotoDevOnly={
          captureFlow?.kind === 'fixture' ? handleFixtureCapture : undefined
        }
        chartGuide={captureFlow?.kind === 'chart' ? CHART_GUIDE : undefined}
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
