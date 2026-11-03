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

import {useCallback, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {Directory, File, Paths} from 'expo-file-system';

import {useIsFocused} from '@react-navigation/native';

import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {
  createRoiAnalyzer,
  RawColorCamera,
} from 'terraso-mobile-client/components/inputs/image/rawColorCamera';
import type {
  CaptureRequest,
  LinearRgb,
  RawColorCameraHandle,
  RoiStats,
} from 'terraso-mobile-client/components/inputs/image/rawColorCamera.types';
import {SimpleRawCamera} from 'terraso-mobile-client/components/inputs/image/SimpleRawCamera';
import {
  DISPLAY_REF_ROI,
  DISPLAY_SAMPLE_ROI,
  type FractionalRoi,
} from 'terraso-mobile-client/components/inputs/image/useRoiFrameAnalyzer';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

const f = (n: number) => n.toFixed(3);

// Live ROI overlay box, positioned by fractional ROI; green when well-framed
// (low luma variance), red otherwise, grey until the first stat arrives.
const roiBoxStyle = (
  roi: {x: number; y: number; w: number; h: number},
  color: string,
): ViewStyle => ({
  position: 'absolute',
  left: `${roi.x * 100}%`,
  top: `${roi.y * 100}%`,
  width: `${roi.w * 100}%`,
  height: `${roi.h * 100}%`,
  borderWidth: 3,
  borderColor: color,
});

// Sanity-check a decoded soil colour (see earlier notes): flag all-black,
// all-white/saturated, or channels-all-equal (grey) — applied to the SAMPLE
// only, since the reference card is meant to be near-neutral.
const checkSampleColor = (c: LinearRgb): {ok: boolean; note: string} => {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  const mean = (c.r + c.g + c.b) / 3;
  if (max < 0.02) return {ok: false, note: 'all black'};
  if (max <= 1.5 && min > 0.95) {
    return {ok: false, note: 'all white / saturated'};
  }
  if ((max - min) / (mean + 1e-6) < 0.02) {
    return {ok: false, note: 'channels ~equal (grey?)'};
  }
  return {ok: true, note: 'ok'};
};

const wbAlertBody = (ref: LinearRgb, sample: LinearRgb): string => {
  const eps = 1e-6;
  const wb = {
    r: sample.r / (ref.r + eps),
    g: sample.g / (ref.g + eps),
    b: sample.b / (ref.b + eps),
  };
  const wbMax = Math.max(wb.r, wb.g, wb.b) || 1;
  return (
    `REF   r ${f(ref.r)}  g ${f(ref.g)}  b ${f(ref.b)}\n` +
    `SOIL  r ${f(sample.r)}  g ${f(sample.g)}  b ${f(sample.b)}\n\n` +
    `WB soil (÷ref, normalized):\n` +
    `  r ${f(wb.r / wbMax)}  g ${f(wb.g / wbMax)}  b ${f(wb.b / wbMax)}`
  );
};

/**
 * Dev-only full-screen RAW capture smoke test, flag-gated via the dev menu.
 *
 * Android exercises the NEW RawColorCamera API (ref.capture() → Capture →
 * decodeRois, with an "Analyzing…" overlay during decode and an Auto stress
 * loop). iOS still runs the legacy SimpleRawCamera flow — its RawColorCamera
 * engine is a later slice.
 */
export function RawCaptureTestScreen() {
  return Platform.OS === 'android' ? (
    <AndroidRawColorTest />
  ) : (
    <IosLegacyTest />
  );
}

// ---------------------------------------------------------------------------
// Android: the new RawColorCamera API.

// Auto stress test: cycle through capture configurations, N shots each,
// remounting the camera between modes (= reopening the screen, which is what
// real use does — a fresh session bound for that mode). Every SAVE_EVERY-th
// shot exercises the persist path (save → verify → delete, so nothing
// accumulates). Includes a JPEG-only (no-RAW) mode that simulates a device
// without RAW support (native binds preview+jpeg, captures a JPEG only).
const SHOTS_PER_MODE = 25;
const SAVE_EVERY = 100;
// Wait after a mode remount for the new session to acquire + bind before
// capturing (mimics a user opening the screen and waiting a beat).
const REMOUNT_SETTLE_MS = 2000;
const SHOT_GAP_MS = 400;

type AutoMode = {
  label: string;
  request: CaptureRequest;
  /** Whether to decode the SAMPLE ROI (requires a RAW/DNG). */
  decode: boolean;
};

function AndroidRawColorTest() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const camRef = useRef<RawColorCameraHandle>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [shotCount, setShotCount] = useState(0);
  const [lastStatus, setLastStatus] = useState('');
  // Which auto mode is mounted right now; also the camera's remount key.
  const [modeIdx, setModeIdx] = useState(0);
  const autoRef = useRef(false);

  // Live framing analysis: the injected analyzer emits per-ROI luma stats; we
  // draw the overlay (red/green per ROI) from them. Created once.
  const [quality, setQuality] = useState<RoiStats[]>([]);
  const analyzer = useMemo(
    () =>
      createRoiAnalyzer({
        rois: [DISPLAY_REF_ROI, DISPLAY_SAMPLE_ROI],
        onStats: setQuality,
      }) ?? undefined,
    [],
  );

  // The capture configurations the Auto stress test rotates through. Each is
  // bound by remounting the camera (reopen semantics), so this exercises the
  // full bind + capture path per mode, not just a capture() option.
  const autoModes = useMemo<AutoMode[]>(
    () => [
      {
        label: 'RAW+JPEG +analysis',
        request: {raw: true, jpeg: 'always', analyze: analyzer},
        decode: true,
      },
      {
        label: 'RAW only +analysis',
        request: {raw: true, jpeg: 'never', analyze: analyzer},
        decode: true,
      },
      {
        label: 'RAW+JPEG no-analysis',
        request: {raw: true, jpeg: 'always'},
        decode: true,
      },
      {
        // Simulates a phone that can't do RAW: binds preview+jpeg(+analysis),
        // captures a JPEG only (no DNG → nothing to decode).
        label: 'JPEG only (no RAW)',
        request: {raw: false, jpeg: 'always', analyze: analyzer},
        decode: false,
      },
    ],
    [analyzer],
  );

  // Managed cache subdir for the periodic save test (created lazily, files
  // deleted right after each save so it never accumulates).
  const saveDir = useMemo(() => {
    const d = new Directory(Paths.cache, 'rawAutoSaveTest');
    try {
      d.create({idempotent: true});
    } catch {
      // already exists / best effort
    }
    return d;
  }, []);

  // Decode both ROIs (fractional — the camera maps to pixels internally),
  // white-balance, and alert. Shows the "Analyzing…" overlay during decode.
  const manualShutter = useCallback(async () => {
    const cam = camRef.current;
    if (!cam || analyzing) {
      return;
    }
    let cap;
    try {
      cap = await cam.capture({
        onCaptured: () => console.log('[rawperf] CAPTURED — safe to move'),
      });
    } catch (err) {
      Alert.alert('Capture failed', String(err));
      return;
    }
    setAnalyzing(true);
    await new Promise<void>(r => setTimeout(r, 0)); // let the overlay paint
    let title: string;
    let body: string;
    try {
      const td = Date.now();
      const [ref, sample] = await cap.decodeRois([
        DISPLAY_REF_ROI,
        DISPLAY_SAMPLE_ROI,
      ]);
      console.log(`[rawperf] decodeRois(ref,sample) ${Date.now() - td}ms`);
      title = 'RAW ref + sample (linear RGB)';
      body = wbAlertBody(ref, sample);
    } catch (err) {
      title = 'Decode failed';
      body = String(err);
    } finally {
      cap.dispose();
      setAnalyzing(false);
    }
    navigation.goBack();
    Alert.alert(title, body);
  }, [analyzing, navigation]);

  const stopAuto = useCallback(() => {
    autoRef.current = false;
    setAutoRunning(false);
  }, []);

  const startAuto = useCallback(() => {
    if (autoRef.current) {
      return;
    }
    autoRef.current = true;
    setAutoRunning(true);
    setShotCount(0);
    setModeIdx(0);
    setLastStatus('starting…');
    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    // Exercise the persist path without accumulating: copy out, confirm the
    // files landed, delete them.
    const saveAndDelete = async (
      cap: Awaited<ReturnType<RawColorCameraHandle['capture']>>,
    ): Promise<string> => {
      const written = await cap.save({dir: saveDir.uri});
      const uris = [written.dngUri, written.jpegUri].filter(
        (u): u is string => !!u,
      );
      let bytes = 0;
      for (const uri of uris) {
        try {
          const file = new File(uri);
          bytes += file.size ?? 0;
          file.delete();
        } catch {
          // best effort
        }
      }
      return ` · saved+deleted ${uris.length} file(s), ${bytes}B`;
    };
    let susp = 0;
    let fail = 0;
    let global = 0;
    (async () => {
      let m = 0;
      while (autoRef.current) {
        const mode = autoModes[m % autoModes.length];
        setModeIdx(m % autoModes.length);
        setLastStatus(`→ mode: ${mode.label} (remounting…)`);
        await sleep(REMOUNT_SETTLE_MS); // let the fresh session bind
        for (let s = 0; s < SHOTS_PER_MODE && autoRef.current; s += 1) {
          const cam = camRef.current;
          if (!cam) {
            await sleep(300); // remount not ready yet; retry
            continue;
          }
          global += 1;
          let status: string;
          try {
            const cap = await cam.capture();
            try {
              const saveNote =
                global % SAVE_EVERY === 0 ? await saveAndDelete(cap) : '';
              if (mode.decode) {
                const [sample] = await cap.decodeRois([DISPLAY_SAMPLE_ROI]);
                const v = checkSampleColor(sample);
                if (!v.ok) susp += 1;
                status =
                  `${v.ok ? '✓' : '⚠'} ${mode.label} #${global}: ` +
                  `r${f(sample.r)} g${f(sample.g)} b${f(sample.b)}` +
                  `${v.ok ? '' : ` — ${v.note}`}${saveNote}`;
              } else {
                status = `✓ ${mode.label} #${global}: captured${saveNote}`;
              }
            } finally {
              cap.dispose();
            }
          } catch (err) {
            fail += 1;
            status = `✗ ${mode.label} #${global}: ${String(err)}`;
          }
          setShotCount(global);
          setLastStatus(`${status}  (susp ${susp}, fail ${fail} / ${global})`);
          if (!autoRef.current) break;
          await sleep(SHOT_GAP_MS);
        }
        m += 1;
      }
    })().catch(() => {});
  }, [autoModes, saveDir]);

  const cancel = useCallback(() => {
    stopAuto();
    navigation.goBack();
  }, [stopAuto, navigation]);

  const shutterDisabled = analyzing || autoRunning;
  // While Auto runs, the request (and key) follow the current mode so the
  // camera remounts per mode. Idle/manual framing uses the full analysis bind.
  const activeRequest: CaptureRequest = autoRunning
    ? autoModes[modeIdx].request
    : {raw: true, jpeg: 'always', analyze: analyzer};
  const camKey = autoRunning ? `auto-${modeIdx}` : 'manual';
  return (
    <ScreenScaffold AppBar={<AppBar title="RAW capture (new API)" />}>
      <View style={styles.fill}>
        <RawColorCamera
          key={camKey}
          ref={camRef}
          active={isFocused}
          request={activeRequest}
          style={StyleSheet.absoluteFill}
          onError={e => console.warn('RawColorCamera error:', e)}>
          {/* Live ROI overlay, drawn from the analyzer's onStats. Approx
              alignment over the FILL_CENTER preview — enough to see the
              red/green framing feedback update live. */}
          {[DISPLAY_REF_ROI, DISPLAY_SAMPLE_ROI].map((roi, i) => {
            const stat = quality.find(s => s.roi === i);
            const color = stat
              ? stat.variance < 500
                ? '#22ee22'
                : '#ee2222'
              : 'rgba(255,255,255,0.5)';
            return (
              <View
                key={i}
                pointerEvents="none"
                style={roiBoxStyle(roi, color)}
              />
            );
          })}
        </RawColorCamera>
        {autoRunning && (
          <SafeAreaView style={styles.statusBanner} edges={['top']}>
            <Text style={styles.statusText}>
              Auto-test · {autoModes[modeIdx]?.label} · shot {shotCount}
            </Text>
            <Text style={styles.statusText} numberOfLines={2}>
              {lastStatus}
            </Text>
          </SafeAreaView>
        )}
        <SafeAreaView style={styles.controls} edges={['bottom']}>
          <Pressable
            onPress={cancel}
            style={styles.sideButton}
            accessibilityRole="button">
            <Text style={styles.sideText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={manualShutter}
            disabled={shutterDisabled}
            accessibilityRole="button"
            style={[styles.shutter, shutterDisabled && styles.disabled]}
          />
          <Pressable
            onPress={autoRunning ? stopAuto : startAuto}
            disabled={analyzing}
            accessibilityRole="button"
            style={[
              styles.autoButton,
              autoRunning && styles.autoButtonActive,
              analyzing && styles.disabled,
            ]}>
            <Text style={styles.sideText}>{autoRunning ? 'Stop' : 'Auto'}</Text>
          </Pressable>
        </SafeAreaView>
        {analyzing && (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.analyzingText}>Analyzing…</Text>
          </View>
        )}
      </View>
    </ScreenScaffold>
  );
}

// ---------------------------------------------------------------------------
// iOS: legacy SimpleRawCamera flow (unchanged; its RawColorCamera engine is a
// later slice). Uses the old pixel-coord decodeRoi.

const roiToPixels = (
  dims: {width: number; height: number},
  roi: FractionalRoi,
) => {
  const effW = Math.min(dims.width, dims.height);
  const effH = Math.max(dims.width, dims.height);
  return {
    x: Math.round(roi.x * effW),
    y: Math.round(roi.y * effH),
    w: Math.round(roi.w * effW),
    h: Math.round(roi.h * effH),
  };
};

function IosLegacyTest() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [analyzing, setAnalyzing] = useState(false);

  const onCapture = useCallback(
    async (result: CaptureResult) => {
      if (result.kind !== 'raw') {
        navigation.goBack();
        Alert.alert('Unexpected capture', `Got "${result.kind}".`);
        return;
      }
      console.log('[rawperf] CAPTURED — safe to move; decoding…');
      setAnalyzing(true);
      await new Promise<void>(r => setTimeout(r, 0));
      let title: string;
      let body: string;
      try {
        const td = Date.now();
        const [ref, sample] = await result.decodeRois([
          roiToPixels(result, DISPLAY_REF_ROI),
          roiToPixels(result, DISPLAY_SAMPLE_ROI),
        ]);
        console.log(`[rawperf] decodeRois(ref,sample) ${Date.now() - td}ms`);
        title = 'RAW ref + sample (linear RGB)';
        body = wbAlertBody(ref, sample);
      } catch (err) {
        title = 'Decode failed';
        body = String(err);
      } finally {
        result.dispose();
        setAnalyzing(false);
      }
      navigation.goBack();
      Alert.alert(title, body);
    },
    [navigation],
  );

  const onCancel = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <View style={styles.fill}>
      <SimpleRawCamera
        visible={isFocused}
        onCapture={onCapture}
        onCancel={onCancel}
      />
      {analyzing && (
        <View style={styles.analyzingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.analyzingText}>Analyzing…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1, backgroundColor: 'black'},
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  sideButton: {width: 80},
  sideText: {color: 'white', fontSize: 16},
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'white',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  autoButton: {
    width: 80,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  autoButtonActive: {backgroundColor: 'rgba(220,40,40,0.85)'},
  disabled: {opacity: 0.4},
  statusBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  statusText: {color: 'white', fontSize: 14},
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  analyzingText: {color: 'white', fontSize: 18, marginTop: 12},
});
