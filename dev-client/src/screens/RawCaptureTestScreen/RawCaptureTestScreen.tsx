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
import {
  DISPLAY_REF_ROI,
  DISPLAY_SAMPLE_ROI,
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
 * One shared harness on both platforms (RawColorCamera: ref.capture() →
 * Capture → decodeRois, "Analyzing…" overlay during decode, live red/green ROI
 * overlay while framing, and an Auto soak). The only per-platform difference is
 * the Auto mode list + whether modes remount the camera between them — plain
 * data (getPlatformTestConfig), not different UX code.
 */
export function RawCaptureTestScreen() {
  return <RawColorTest />;
}

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

// Per-platform Auto config. Android cycles the full capture-configuration
// matrix, remounting between modes (= reopening the screen — the real bind
// path, and the only way to exercise the native stream/rawless swaps). iOS has
// no rawless/stream-swap modes to exercise, and rapidly reconfiguring the
// vision-camera session risks wedging the camera service, so it runs a single
// mode in place with no remount. `manualRequest` is the idle/framing bind (full
// analysis) shared by both.
const getPlatformTestConfig = (
  manualRequest: CaptureRequest,
  analyzer: CaptureRequest['analyze'],
): {modes: AutoMode[]; cycleWithRemount: boolean} => {
  if (Platform.OS === 'android') {
    return {
      cycleWithRemount: true,
      modes: [
        {label: 'RAW+JPEG +analysis', request: manualRequest, decode: true},
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
    };
  }
  // iOS: single mode, no remount (see above).
  return {
    cycleWithRemount: false,
    modes: [
      {label: 'RAW+JPEG +analysis', request: manualRequest, decode: true},
    ],
  };
};

function RawColorTest() {
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

  // Idle/framing bind (full analysis) — also the shared capture request.
  const manualRequest = useMemo<CaptureRequest>(
    () => ({raw: true, jpeg: 'always', analyze: analyzer}),
    [analyzer],
  );
  const {modes: autoModes, cycleWithRemount} = useMemo(
    () => getPlatformTestConfig(manualRequest, analyzer),
    [manualRequest, analyzer],
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
        // Only reconfigure/remount when the platform cycles modes (Android).
        // iOS keeps the one bind up and just repeats capture in place.
        if (cycleWithRemount) {
          setModeIdx(m % autoModes.length);
          setLastStatus(`→ mode: ${mode.label} (remounting…)`);
          await sleep(REMOUNT_SETTLE_MS); // let the fresh session bind
        }
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
            // Halt the soak on the first failure so the evidence survives:
            // the app stops shooting, so this error stays at the tail of the
            // (small) logcat buffer, and the banner holds the mode + error.
            // console.error also drops it into logcat under ReactNativeJS.
            console.error(
              `[rawperf] AUTO FAILURE #${global} (${mode.label}): ${String(err)}`,
            );
            autoRef.current = false;
            setAutoRunning(false);
          }
          setShotCount(global);
          setLastStatus(`${status}  (susp ${susp}, fail ${fail} / ${global})`);
          if (!autoRef.current) break;
          await sleep(SHOT_GAP_MS);
        }
        m += 1;
      }
    })().catch(() => {});
  }, [autoModes, cycleWithRemount, saveDir]);

  const cancel = useCallback(() => {
    stopAuto();
    navigation.goBack();
  }, [stopAuto, navigation]);

  const shutterDisabled = analyzing || autoRunning;
  // While Auto runs, the request (and key) follow the current mode. Remounting
  // (Android) rebinds per mode; on iOS the key stays fixed so the session is
  // never torn down mid-soak. Idle framing uses the full-analysis bind.
  const activeRequest: CaptureRequest = autoRunning
    ? autoModes[modeIdx].request
    : manualRequest;
  const camKey = autoRunning && cycleWithRemount ? `auto-${modeIdx}` : 'manual';
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
          {/* Live ROI overlay, drawn from the analyzer's onStats. Rendered
              inside the shared sensor-aspect frame, so the boxes align 1:1 with
              the preview (and the captured DNG) on both platforms. */}
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
