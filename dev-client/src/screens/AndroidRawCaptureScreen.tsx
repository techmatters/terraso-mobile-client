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
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import Share from 'react-native-share';

import {useKeepAwake} from 'expo-keep-awake';

import {DngDecoderHybrid} from 'dng-decoder';
import type {
  CaptureCapabilities,
  CapturedPhoto,
  CaptureOptions,
} from 'raw-camera-android';
import {RawCameraAndroidHybrid, RawCameraAndroidView} from 'raw-camera-android';

import {
  AndroidRawCaptureCallbacks,
  consumeAndroidRawCaptureCallbacks,
} from 'terraso-mobile-client/components/inputs/image/androidRawCaptureRequest';
import type {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {
  ChartGuideOverlay,
  SENSOR_ASPECT_PORTRAIT,
  SensorAspectFrame,
} from 'terraso-mobile-client/components/inputs/image/RawCameraView';
import {
  getActiveRoiPresetIndex,
  ROI_PRESETS,
  setActiveRoiPresetIndex,
} from 'terraso-mobile-client/components/inputs/image/useRoiFrameAnalyzer';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {getMultishotSessionContext} from 'terraso-mobile-client/screens/RawColorToolsScreen/RawColorToolsScreen';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {
  logCalibrateStep,
  startCalibrateTimer,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/calibrateTimingLog';

// Fixed burst size when burst mode is enabled. See
// docs/munsell-dark-sensor.md option #3 — 5 frames give ~2.2× shot-noise
// reduction (Poisson √N), which is the sweet spot before capture
// latency becomes annoying.
const BURST_COUNT = 5;

// Preset ISO values shown by the manual-exposure stepper. Native clamps
// to the sensor's advertised range so an out-of-range value is silently
// coerced — we don't need to filter here.
const ISO_PRESETS = [50, 100, 200, 400, 800, 1600, 3200, 6400] as const;

// Preset shutter times in nanoseconds. Common photographic stops from
// 1/2000s to 1s. Displayed as fractions in the UI.
const SHUTTER_PRESETS_NS = [
  500_000, // 1/2000
  1_000_000, // 1/1000
  2_000_000, // 1/500
  4_000_000, // 1/250
  8_000_000, // 1/125
  16_667_000, // 1/60
  33_333_000, // 1/30
  66_667_000, // 1/15
  125_000_000, // 1/8
  250_000_000, // 1/4
  500_000_000, // 1/2
  1_000_000_000, // 1s
] as const;

// Fixed sweep for MULTI (research-data collection) sessions. See
// docs/munsell-multishot.md for rationale on each row.
//   1. (1/30, ISO 100) — 2× shutter vs the burst's implicit auto baseline
//   2. (1/15, ISO 100) — 4× shutter, characterises clipping onset
//   3. (1/60, ISO 400) — same brightness as row 2 via ISO instead of shutter
//   4. (1/30, ISO 200) — mid-point handheld tradeoff
const MULTI_SESSION_BURST_COUNT = 5;
const MULTI_SESSION_MANUAL_SHOTS: readonly {iso: number; shutterNs: number}[] =
  [
    {iso: 100, shutterNs: 33_333_000}, // 1/30
    {iso: 100, shutterNs: 66_667_000}, // 1/15
    {iso: 400, shutterNs: 16_667_000}, // 1/60
    {iso: 200, shutterNs: 33_333_000}, // 1/30
  ];
const MULTI_SESSION_TOTAL =
  MULTI_SESSION_BURST_COUNT + MULTI_SESSION_MANUAL_SHOTS.length;

// Full-screen React Navigation route for Android RAW capture. Owns the
// native RawCameraAndroidView (which drives CameraSessionManager via
// its window-attach lifecycle), and pops back with the captured
// {kind:'raw', ...} CaptureResult by invoking the callbacks stashed
// in androidRawCaptureRequest.
//
// This exists as a separate screen (rather than an in-place overlay
// on RawCameraView) because the CameraX pipeline needs a full-screen,
// primary-Window container to work — CameraX doesn't play with RN's
// Modal (Dialog window) or with an absolute overlay trapped inside a
// bottom-sheet parent tree. Navigating to a dedicated screen gets us
// exactly the environment the standalone dev test screen used to
// prove capture works.
export const AndroidRawCaptureScreen = () => {
  const navigation = useNavigation();
  // Screen is only mounted while the user is on it, so a plain
  // useKeepAwake tied to component lifetime is exactly what we want.
  // Prevents Android's idle-dim from kicking in while the user is
  // framing a card in the phase-8 overlay.
  useKeepAwake('AndroidRawCaptureScreen');

  // Grab the pending callbacks synchronously on the first render (via
  // a useRef gate — NOT a useEffect). Reason: the native
  // RawCameraAndroidView mounts on the FIRST commit, and its bound
  // props (preferJpeg + skipJpeg especially) drive the CameraX bind
  // fallback at attachSurfaceProvider time. A previous version read
  // the callbacks in useEffect, which fires AFTER the first commit —
  // so the initial render mounted the native view with preferJpeg=
  // false, the session bound with JPEG dropped, and any subsequent
  // prop update didn't rebind (the atomic flag change doesn't force
  // a session rebuild). That silently killed the JPEG companion for
  // the RAW+JPEG grab flow on constrained devices like Pixel 7.
  //
  // Missing callbacks means the screen was opened directly (deep
  // link, dev tools) rather than through RawCameraView — treat that
  // as an error UI (noCallbacks flag).
  //
  // The `| undefined` sentinel is "not yet consumed"; null means
  // "consumed but no callbacks were pending" (error case).
  const callbacksRef = useRef<AndroidRawCaptureCallbacks | null | undefined>(
    undefined,
  );
  if (callbacksRef.current === undefined) {
    callbacksRef.current = consumeAndroidRawCaptureCallbacks();
    if (callbacksRef.current == null) {
      console.warn('AndroidRawCaptureScreen mounted with no pending callbacks');
    }
  }
  const cb = callbacksRef.current;
  const noCallbacks = cb == null;
  const chartGuide = cb?.chartGuide ?? null;
  const showResearchControls = cb?.showResearchControls ?? false;
  const captureHint = cb?.captureHint ?? null;
  const roiHint = cb?.roiHint ?? null;
  const skipJpeg = cb?.skipJpeg ?? false;
  const preferJpeg = cb?.preferJpeg ?? false;
  const simpleShutter = cb?.simpleShutter ?? false;
  // ROI preset index — shared with iOS soil-color RAW-Live via
  // useRoiFrameAnalyzer's ROI_PRESETS + kvStorage. +/- buttons flanking
  // the shutter cycle through 4 sizes (tiny/small/medium/large); the
  // current preset drives BOTH the native RoiOverlayView + analyser
  // rectangles (via the refRoi{X,Y,W,H} / sampleRoi{X,Y,W,H} view
  // props) AND the JS label positions.
  const [roiPresetIndex, setRoiPresetIndex] = useState(getActiveRoiPresetIndex);
  const activePreset = ROI_PRESETS[roiPresetIndex];
  const changeRoiPresetIndex = useCallback((next: number) => {
    setRoiPresetIndex(next);
    setActiveRoiPresetIndex(next);
  }, []);
  const [isCapturing, setIsCapturing] = useState(false);
  const [caps, setCaps] = useState<CaptureCapabilities | null>(null);
  const [evIndex, setEvIndex] = useState(0);
  const [burstOn, setBurstOn] = useState(false);
  const [manualOn, setManualOn] = useState(false);
  // Indices into the preset arrays; start at ISO 100 and 1/60s (both
  // familiar defaults). Native clamps to the sensor range, so if the
  // preset is out-of-range the HAL sees the nearest legal value.
  const [isoIdx, setIsoIdx] = useState(ISO_PRESETS.indexOf(100));
  const [shutIdx, setShutIdx] = useState(
    SHUTTER_PRESETS_NS.indexOf(16_667_000),
  );

  // Fetch capabilities once the native session binds. getCaptureCapabilities
  // triggers ensureBound if needed, which is safe from JS but can race
  // with the view's own attach on the very first frame — a single retry
  // covers that. If the whole thing fails (no camera / no RAW support)
  // we surface the error rather than silently hiding the controls.
  useEffect(() => {
    let cancelled = false;
    const attempt = async (retryLeft: number): Promise<void> => {
      try {
        const c = await RawCameraAndroidHybrid.getCaptureCapabilities();
        if (!cancelled) setCaps(c);
      } catch (err) {
        if (retryLeft > 0) {
          await new Promise<void>(r => setTimeout(() => r(), 300));
          if (!cancelled) return attempt(retryLeft - 1);
        }
        console.warn(
          'AndroidRawCaptureScreen: getCaptureCapabilities failed',
          err,
        );
      }
    };
    attempt(2);
    return () => {
      cancelled = true;
    };
  }, []);

  const evLabel = useMemo(
    () => (caps ? formatEvLabel(evIndex, caps) : formatEvLabel(evIndex, null)),
    [evIndex, caps],
  );
  const canDecEv = caps ? evIndex > caps.aeCompensationMin : true;
  const canIncEv = caps ? evIndex < caps.aeCompensationMax : true;

  const buildOptions = useCallback((): CaptureOptions => {
    return {
      aeCompensation: evIndex,
      ...(manualOn
        ? {
            sensorSensitivity: ISO_PRESETS[isoIdx],
            sensorExposureTimeNs: SHUTTER_PRESETS_NS[shutIdx],
          }
        : {}),
      // Chart flow wants the JPEG (JPEG-pipeline A/B); calibrate +
      // fixture flows set skipJpeg on the callbacks so the native
      // side drops the second takePicture from the critical path.
      // Never skip when burst mode is on (burst = research, wants
      // JPEG companion for every frame).
      ...(skipJpeg && !burstOn ? {skipJpeg: true} : {}),
    };
  }, [evIndex, manualOn, isoIdx, shutIdx, skipJpeg, burstOn]);

  // Fire onCancel if the user pops via the AppBar back button (or
  // Android system back) without going through shutter. Won't fire on
  // shutter success — we set cancelledRef.current before the pop in
  // that path so this beforeRemove is idempotent-safe.
  const cancelledRef = useRef(false);
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      if (cancelledRef.current) return;
      cancelledRef.current = true;
      callbacksRef.current?.onCancel();
      callbacksRef.current = null;
    });
    return unsub;
  }, [navigation]);

  const shutter = useCallback(async () => {
    if (isCapturing) return;
    startCalibrateTimer();
    logCalibrateStep('shutter tap');
    setIsCapturing(true);
    try {
      const options = buildOptions();
      let primary: CapturedPhoto;
      if (burstOn) {
        console.log(
          `[AndroidRawCaptureScreen] captureBurst(${BURST_COUNT}, ${JSON.stringify(options)})`,
        );
        const frames = await RawCameraAndroidHybrid.captureBurst(
          BURST_COUNT,
          options,
        );
        // Downstream analysis consumes a single frame — use the first.
        // The other frames are for offline averaging experiments, so
        // pop the share sheet with all N DNGs before continuing to
        // analysis. failOnCancel:false so a dismissed sheet still lets
        // the analysis flow proceed with frame 0.
        primary = frames[0];
        console.log(
          '[AndroidRawCaptureScreen] burst frames written:',
          frames.map(f => f.dngPath),
        );
        try {
          await Share.open({
            urls: frames.map(f => f.dngPath),
            type: 'image/x-adobe-dng',
            failOnCancel: false,
          });
        } catch (err) {
          console.warn(
            '[AndroidRawCaptureScreen] burst share failed (continuing)',
            err,
          );
        }
      } else {
        console.log(
          `[AndroidRawCaptureScreen] capturePhoto(${JSON.stringify(options)})`,
        );
        primary = await RawCameraAndroidHybrid.capturePhoto(options);
      }
      const {dngPath, jpegPath, width, height} = primary;
      logCalibrateStep('native capturePhoto returned');
      console.log(
        `[AndroidRawCaptureScreen] DNG captured: ${width}x${height}` +
          ` (aspect=${(width / height).toFixed(3)})` +
          ` jpeg=${jpegPath ? 'yes' : 'no'}` +
          ` path=${dngPath}`,
      );
      const result: CaptureResult = {
        kind: 'raw',
        dngPath,
        jpegPath,
        width,
        height,
        decodeRoi: async roi => {
          const [rgb] = await DngDecoderHybrid.decodeDngRois(dngPath, [roi]);
          return rgb;
        },
        renderPreview: async maxDim => {
          const p = await DngDecoderHybrid.renderPreview(dngPath, maxDim);
          return {uri: p.uri, width: p.width, height: p.height};
        },
        dispose: () => {},
      };
      // Pop AndroidRawCaptureScreen FIRST, THEN invoke the callback.
      // The callback typically synchronously navigates to the
      // downstream RAW analysis screen (push). If we pop() after the
      // callback, we'd pop the analysis screen we just pushed instead
      // of AndroidRawCaptureScreen.
      cancelledRef.current = true; // suppress the beforeRemove onCancel
      const activeCb = callbacksRef.current;
      callbacksRef.current = null;
      // Dismiss the "Capturing…" overlay before the nav-pop animation
      // starts — the DNG is already on disk at this point so the
      // overlay's "you're waiting for the sensor" cue has served its
      // purpose. Keeping it up through the ~300ms pop transition
      // (and the ~1s renderPreview on the next screen) reads as "the
      // capture is still going" even though it isn't.
      setIsCapturing(false);
      logCalibrateStep('nav.pop');
      navigation.pop();
      activeCb?.onCapture(result);
    } catch (err) {
      console.error('AndroidRawCaptureScreen shutter failed:', err);
      Alert.alert('Capture failed', String(err), [
        {text: 'OK', onPress: () => navigation.pop()},
      ]);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, buildOptions, burstOn, navigation]);

  // MULTI-session shutter. Fires the full research-collection sweep
  // (5 burst @ auto + 4 manual iso/shutter combos) via captureSession,
  // which writes to MediaStore.Downloads/soilcap/session_<ts>/. On
  // completion pops back one screen (to the page picker) so the user
  // can select the next Munsell card without re-navigating. Does NOT
  // invoke the analysis callback — this is a data-collection flow, all
  // analysis happens offline.
  const runMultiSession = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      // Pull the current session context (page / bg / refcard /
      // illuminant / note) from the RawColorToolsScreen persistence.
      // Empty fields skip cleanly in the native filename builder.
      const context = getMultishotSessionContext();
      console.log(
        `[AndroidRawCaptureScreen] captureSession start ` +
          `(${MULTI_SESSION_BURST_COUNT} burst + ${MULTI_SESSION_MANUAL_SHOTS.length} manual) ` +
          `context=${JSON.stringify(context)}`,
      );
      const frames = await RawCameraAndroidHybrid.captureSession({
        burstCount: MULTI_SESSION_BURST_COUNT,
        manualShots: MULTI_SESSION_MANUAL_SHOTS.map(m => ({
          sensorSensitivity: m.iso,
          sensorExposureTimeNs: m.shutterNs,
        })),
        context,
      });
      console.log(
        `[AndroidRawCaptureScreen] captureSession ok, ${frames.length} shots:`,
        frames.map(f => f.dngPath),
      );
      // Skip the analysis callback and go straight back to the page
      // picker. Set cancelledRef so the beforeRemove listener doesn't
      // fire onCancel on our way out.
      cancelledRef.current = true;
      callbacksRef.current = null;
      navigation.pop();
    } catch (err) {
      console.error('[AndroidRawCaptureScreen] captureSession failed:', err);
      Alert.alert('Multi-shot session failed', String(err));
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, navigation]);

  // Structure kept close to the earlier RawCameraAndroidTestScreen that
  // we know worked — ScreenScaffold + AppBar chrome, view inside a
  // plain flex:1 container. Deviating from that (e.g. StatusBar hidden
  // + bare View) somehow leaves CameraX in a bad state where
  // takePicture times out. In chart-guide mode we wrap the preview in
  // SensorAspectFrame so screen ↔ DNG coords match; in soil-colour
  // mode we keep the old absoluteFill (WYSIWYG isn't required — the
  // ROI picker is post-capture).
  return (
    <ScreenScaffold AppBar={<AppBar title="Android RAW capture" />}>
      <View style={styles.container}>
        {/*
         * Native view stays flat/fullscreen — nesting it inside a
         * fixed-size wrapper leaves CameraX in a bad state where
         * takePicture times out. In chart-guide mode we instead ask
         * the PreviewView to FIT_CENTER (letterbox the 3:4 preview
         * inside the tall view), and wrap only the JS ChartGuideOverlay
         * in a matching SensorAspectFrame so it lands on the same
         * letterboxed region. Result: the on-screen guide covers the
         * same fraction of the sensor image as the analyser's guide
         * covers of the captured DNG.
         */}
        <RawCameraAndroidView
          style={StyleSheet.absoluteFill}
          // Native RoiOverlayView is on by default so calibrate + soil-
          // color flows get live red/green outlines. Off for chart
          // (has its own guide overlay) AND for the simple-shutter
          // grab-and-share flow (no ROI machinery at all).
          showRoiOverlay={!chartGuide && !simpleShutter}
          previewFitCenter={!!chartGuide || !!roiHint}
          refRoiX={activePreset.ref.x}
          refRoiY={activePreset.ref.y}
          refRoiW={activePreset.ref.w}
          refRoiH={activePreset.ref.h}
          sampleRoiX={activePreset.sample.x}
          sampleRoiY={activePreset.sample.y}
          sampleRoiW={activePreset.sample.w}
          sampleRoiH={activePreset.sample.h}
          preferJpeg={preferJpeg}
        />
        {chartGuide && (
          <SensorAspectFrame aspect={SENSOR_ASPECT_PORTRAIT}>
            <ChartGuideOverlay guide={chartGuide} />
          </SensorAspectFrame>
        )}
        {roiHint && (
          <SensorAspectFrame aspect={SENSOR_ASPECT_PORTRAIT}>
            <LabeledRoiOverlay
              labels={roiHint.labels}
              refRoi={activePreset.ref}
              sampleRoi={activePreset.sample}
            />
          </SensorAspectFrame>
        )}
        {/*
         * Research controls (EV / Burst / Manual / MULTI) only appear
         * when the caller opted in via callbacks.showResearchControls
         * — currently the Munsell chart validator flow. Calibrate /
         * fixture flows get a clean single-shot UI with just the
         * shutter (and optional captureHint banner).
         */}
        {showResearchControls && (
          <View style={styles.controlsPanel} pointerEvents="box-none">
            <Stepper
              label="EV"
              value={evLabel}
              onDec={() => setEvIndex(i => i - 1)}
              onInc={() => setEvIndex(i => i + 1)}
              canDec={canDecEv && !isCapturing}
              canInc={canIncEv && !isCapturing}
            />
            <Toggle
              label={`Burst ${BURST_COUNT}×`}
              on={burstOn}
              onToggle={() => setBurstOn(v => !v)}
              disabled={isCapturing}
            />
            <Toggle
              label="Manual"
              on={manualOn}
              onToggle={() => setManualOn(v => !v)}
              disabled={isCapturing}
            />
            {manualOn && (
              <>
                <Stepper
                  label="ISO"
                  value={String(ISO_PRESETS[isoIdx])}
                  onDec={() => setIsoIdx(i => Math.max(0, i - 1))}
                  onInc={() =>
                    setIsoIdx(i => Math.min(ISO_PRESETS.length - 1, i + 1))
                  }
                  canDec={isoIdx > 0 && !isCapturing}
                  canInc={isoIdx < ISO_PRESETS.length - 1 && !isCapturing}
                />
                <Stepper
                  label="Shutter"
                  value={formatShutterLabel(SHUTTER_PRESETS_NS[shutIdx])}
                  onDec={() => setShutIdx(i => Math.max(0, i - 1))}
                  onInc={() =>
                    setShutIdx(i =>
                      Math.min(SHUTTER_PRESETS_NS.length - 1, i + 1),
                    )
                  }
                  canDec={shutIdx > 0 && !isCapturing}
                  canInc={
                    shutIdx < SHUTTER_PRESETS_NS.length - 1 && !isCapturing
                  }
                />
              </>
            )}
          </View>
        )}
        {captureHint && (
          <View style={styles.hintBanner} pointerEvents="none">
            <Text style={styles.hintBannerText}>{captureHint}</Text>
          </View>
        )}
        <View style={styles.bottomBar}>
          {!chartGuide && !simpleShutter && (
            <Pressable
              onPress={() => changeRoiPresetIndex(roiPresetIndex - 1)}
              disabled={roiPresetIndex <= 0 || isCapturing}
              accessibilityRole="button"
              accessibilityLabel="Smaller capture boxes"
              hitSlop={12}
              style={({pressed}) => [
                styles.roiSizeButton,
                (roiPresetIndex <= 0 || isCapturing) &&
                  styles.roiSizeButtonDisabled,
                pressed && styles.roiSizeButtonPressed,
              ]}>
              <Text style={styles.roiSizeButtonText}>−</Text>
            </Pressable>
          )}
          <Pressable
            onPress={shutter}
            disabled={isCapturing || noCallbacks}
            accessibilityRole="button"
            accessibilityLabel="Capture"
            style={({pressed}) => [
              styles.shutter,
              (pressed || isCapturing) && styles.shutterPressed,
            ]}>
            <View style={styles.shutterInner} />
          </Pressable>
          {!chartGuide && (
            <Pressable
              onPress={() => changeRoiPresetIndex(roiPresetIndex + 1)}
              disabled={roiPresetIndex >= ROI_PRESETS.length - 1 || isCapturing}
              accessibilityRole="button"
              accessibilityLabel="Larger capture boxes"
              hitSlop={12}
              style={({pressed}) => [
                styles.roiSizeButton,
                (roiPresetIndex >= ROI_PRESETS.length - 1 || isCapturing) &&
                  styles.roiSizeButtonDisabled,
                pressed && styles.roiSizeButtonPressed,
              ]}>
              <Text style={styles.roiSizeButtonText}>+</Text>
            </Pressable>
          )}
          {showResearchControls && (
            <Pressable
              onPress={runMultiSession}
              disabled={isCapturing}
              accessibilityRole="button"
              accessibilityLabel={`Multi-shot session (${MULTI_SESSION_TOTAL} shots)`}
              style={({pressed}) => [
                styles.multiButton,
                (pressed || isCapturing) && styles.multiButtonPressed,
              ]}>
              <Text style={styles.multiButtonText}>MULTI</Text>
              <Text style={styles.multiButtonSubtext}>
                {MULTI_SESSION_TOTAL}× shots
              </Text>
            </Pressable>
          )}
        </View>
        {isCapturing && (
          <View style={styles.progressOverlay} pointerEvents="auto">
            <View style={styles.progressBox}>
              <Text style={styles.progressTitle}>Capturing…</Text>
              <Text style={styles.progressSubtitle}>Hold the phone still.</Text>
            </View>
          </View>
        )}
      </View>
    </ScreenScaffold>
  );
};

// Draws the LABEL for each ROI in display-space fractional coords
// over its parent frame. The rectangle itself is drawn by the
// native RoiOverlayView (which also colours the outline per-frame
// based on the variance analyser — the live evenness feedback).
// This overlay just adds a legible label pill above each rect so
// the user knows which slot is which. Coords come from the active
// ROI_PRESETS entry so labels move with the +/- size buttons.
const LabeledRoiOverlay = ({
  labels,
  refRoi,
  sampleRoi,
}: {
  labels: readonly [string, string];
  refRoi: {x: number; y: number; w: number; h: number};
  sampleRoi: {x: number; y: number; w: number; h: number};
}) => {
  const [layout, setLayout] = useState<{w: number; h: number} | null>(null);
  const items: {
    label: string;
    roi: {x: number; y: number; w: number; h: number};
  }[] = [
    {label: labels[0], roi: refRoi},
    {label: labels[1], roi: sampleRoi},
  ];
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={e =>
        setLayout({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }>
      {layout &&
        items.map(({label, roi}) => (
          <View
            key={label}
            style={[
              styles.roiHintLabelWrap,
              {
                left: roi.x * layout.w,
                width: roi.w * layout.w,
                top: roi.y * layout.h - 18,
              },
            ]}>
            <View style={styles.roiHintLabelPill}>
              <Text style={styles.roiHintLabelText}>{label}</Text>
            </View>
          </View>
        ))}
    </View>
  );
};

// A row with a label, a value, and [-] / [+] buttons that clamp
// against caller-supplied canDec/canInc.
const Stepper = ({
  label,
  value,
  onDec,
  onInc,
  canDec,
  canInc,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
}) => (
  <View style={styles.stepperRow}>
    <Text style={styles.stepperLabel}>{label}</Text>
    <Pressable
      onPress={onDec}
      disabled={!canDec}
      style={({pressed}) => [
        styles.stepperBtn,
        !canDec && styles.stepperBtnDisabled,
        pressed && canDec && styles.stepperBtnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Decrease ${label}`}>
      <Text style={styles.stepperBtnText}>−</Text>
    </Pressable>
    <Text style={styles.stepperValue}>{value}</Text>
    <Pressable
      onPress={onInc}
      disabled={!canInc}
      style={({pressed}) => [
        styles.stepperBtn,
        !canInc && styles.stepperBtnDisabled,
        pressed && canInc && styles.stepperBtnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Increase ${label}`}>
      <Text style={styles.stepperBtnText}>+</Text>
    </Pressable>
  </View>
);

const Toggle = ({
  label,
  on,
  onToggle,
  disabled,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  disabled: boolean;
}) => (
  <Pressable
    onPress={onToggle}
    disabled={disabled}
    accessibilityRole="switch"
    accessibilityState={{checked: on, disabled}}
    style={({pressed}) => [
      styles.toggle,
      on && styles.toggleOn,
      pressed && styles.togglePressed,
      disabled && styles.toggleDisabled,
    ]}>
    <Text style={[styles.toggleText, on && styles.toggleTextOn]}>
      {on ? '☑' : '☐'} {label}
    </Text>
  </Pressable>
);

// Format the current AE compensation index as an EV string. Mirrors
// the native buildFileStem/formatEv logic so the on-screen label
// matches what's baked into the filename. When caps are null (still
// loading), fall back to showing the raw index so the widget isn't
// stuck on "0" while the ranges resolve.
const formatEvLabel = (
  idx: number,
  caps: CaptureCapabilities | null,
): string => {
  if (idx === 0) return '0';
  if (caps == null || caps.aeCompensationStepDen === 0) {
    return `${idx > 0 ? '+' : ''}${idx}`;
  }
  const ev = (idx * caps.aeCompensationStepNum) / caps.aeCompensationStepDen;
  const rounded = Math.round(ev * 100) / 100;
  const body = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/\.?0+$/, '');
  return rounded > 0 ? `+${body}` : body;
};

const formatShutterLabel = (ns: number): string => {
  if (ns >= 1_000_000_000) return `${Math.round(ns / 1_000_000_000)}s`;
  const denom = Math.round(1_000_000_000 / ns);
  return `1/${denom}s`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  controlsPanel: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 6,
  },
  hintBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 130,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 200, 60, 0.85)',
  },
  hintBannerText: {
    color: 'black',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  roiSizeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roiSizeButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  roiSizeButtonDisabled: {
    opacity: 0.3,
  },
  roiSizeButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  roiHintLabelWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  roiHintLabelPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 220, 90, 0.95)',
  },
  roiHintLabelText: {
    color: 'black',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 64,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.40)',
  },
  stepperBtnDisabled: {
    opacity: 0.3,
  },
  stepperBtnText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  stepperValue: {
    color: 'white',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    minWidth: 72,
    textAlign: 'center',
  },
  toggle: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  toggleOn: {
    backgroundColor: 'rgba(90,180,120,0.55)',
  },
  togglePressed: {
    opacity: 0.7,
  },
  toggleDisabled: {
    opacity: 0.4,
  },
  toggleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextOn: {
    color: 'white',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingBottom: 24,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterPressed: {
    opacity: 0.7,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
  },
  multiButton: {
    minWidth: 88,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'rgba(255,200,60,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiButtonPressed: {
    opacity: 0.7,
  },
  multiButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  multiButtonSubtext: {
    color: 'black',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBox: {
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
  },
  progressTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  progressSubtitle: {
    color: 'white',
    fontSize: 14,
    opacity: 0.85,
  },
});
