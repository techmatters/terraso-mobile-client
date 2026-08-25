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

import {useEffect, useRef, useState} from 'react';
import {Alert, Text as RNText, StyleSheet, TextInput, View} from 'react-native';

import {DngDecoderHybrid} from 'dng-decoder';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {getActiveRoiPreset} from 'terraso-mobile-client/components/inputs/image/useRoiFrameAnalyzer';
import {
  Box,
  Column,
  Paragraph,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollView} from 'terraso-mobile-client/components/safeview/SafeScrollView';
import {
  listCustomReferences,
  saveCustomReference,
} from 'terraso-mobile-client/model/color/customReferences';
import {
  AvailableReference,
  computeCalibratedReference,
  LinearRgb,
  listAvailableReferences,
  rankReferences,
} from 'terraso-mobile-client/model/color/getColorFromLinearRgb';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {logCalibrateStep} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/calibrateTimingLog';
import {
  linearRgbToCss,
  PipelineColumn,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/pipelineColumn';
import {
  RawCrop,
  resetRawAnalysisSession,
  setRawAnalysisCrop,
  useRawAnalysisSession,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/rawAnalysisSession';

export type CalibrateReferenceProps = {
  /** file:// URI to the captured DNG. */
  dngPath: string;
  /** Sensor dimensions from the vision-camera Photo object. */
  sensorWidth: number;
  sensorHeight: number;
  /**
   * ID (as in AvailableReference.id — "builtin:<key>" or "custom:<uuid>")
   * of the known reference the user framed in the "existing" ROI, picked
   * on the previous screen. When resolvable, skips the auto-rank picker
   * and calibrates directly against this ref's linearRgb. Missing / stale
   * ID falls back to the ranked top-pick alert.
   */
  knownRefId?: string;
};

// Phase-6 calibrate-a-new-reference flow. Structural sibling of
// RawColorAnalysisScreen: same preview + two-crop pattern, but the
// "known reference" is picked via the rankReferences picker (so the
// tester also gets a sanity check on which stored card matches best)
// and instead of dispatching a Munsell result the corrected linear-
// sRGB gets prompted for a name and saved to MMKV via
// customReferences.saveCustomReference.
//
// Reuses RawCropScreen for both ROI picks (with label overrides:
// "Known reference" / "New reference" — the underlying role names
// 'reference' and 'sample' are internal to rawAnalysisSession).
export const CalibrateReferenceScreen = ({
  dngPath,
  sensorWidth,
  sensorHeight,
  knownRefId,
}: CalibrateReferenceProps) => {
  const navigation = useNavigation();
  const session = useRawAnalysisSession();
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Two-stage overlay text while the screen is busy. Nulled out once
  // pendingSave is set (the results panel takes over the visible area).
  const [phase, setPhase] = useState<'preview' | 'calibrating'>('preview');
  // Pending-save state. When set, the "Calibrate & Save" section
  // switches into results mode: two-column pipeline visualisation
  // (Existing ref: photo → measured → known linear-sRGB / New ref:
  // photo → measured → computed calibrated linear-sRGB) plus an
  // inline TextInput pre-filled with the auto-generated name and
  // Save/Cancel buttons. Mirrors the soil-id RawColorAnalysisScreen
  // results view.
  const [pendingSave, setPendingSave] = useState<null | {
    defaultName: string;
    illuminant: string | undefined;
    // Computed calibrated linear-sRGB for the new card — persisted on
    // Save via customReferences and shown in the "New ref" column's
    // bottom swatch.
    expected: LinearRgb;
    // Known ref's expected linear-sRGB (bottom swatch of "Existing
    // ref" column).
    knownExpected: LinearRgb;
    // Per-ROI measured averages (middle swatch of each column).
    knownMeasured: LinearRgb;
    newMeasured: LinearRgb;
    // Human-readable label for the "Existing ref" column bottom
    // swatch — the picked known reference's name.
    knownName: string;
  }>(null);
  const [editableName, setEditableName] = useState('');

  // Mount effect — renders preview, seeds crops from the on-camera
  // hint boxes, then immediately kicks off the decode/rank/save-prep
  // work so the user doesn't have to hit a second button. The whole
  // sequence runs behind a full-screen "Working…" overlay (see phase
  // state); at the end, pendingSave is set and the results panel
  // takes over. A ref guards against double-runs across React 18's
  // effect double-invoke in dev.
  const kickedOffRef = useRef(false);
  useEffect(() => {
    logCalibrateStep('Calibrate screen mount');
    if (kickedOffRef.current) return;
    kickedOffRef.current = true;
    resetRawAnalysisSession(null);
    setPhase('preview');
    (async () => {
      let preview: {uri: string; width: number; height: number};
      let refCrop: RawCrop;
      let sampleCrop: RawCrop;
      try {
        logCalibrateStep('renderPreview start');
        // maxDim=800 → ~800×600 output; plenty for the pipeline
        // column crop thumbnails, ~half the gamma+PNG work vs the
        // old 1200 target. Sensor demosaic cost is fixed regardless.
        preview = await DngDecoderHybrid.renderPreview(dngPath, 800);
        logCalibrateStep('renderPreview end');
        resetRawAnalysisSession(preview);
        // Crops come from the same ROI_PRESETS entry the user picked
        // with +/- on the capture screen (or default 'medium').
        const preset = getActiveRoiPreset();
        refCrop = hintRoiToSquareRawCrop(
          preset.ref,
          preview.width,
          preview.height,
        );
        sampleCrop = hintRoiToSquareRawCrop(
          preset.sample,
          preview.width,
          preview.height,
        );
        setRawAnalysisCrop('reference', refCrop);
        setRawAnalysisCrop('sample', sampleCrop);
        logCalibrateStep('seeds set');
      } catch (err) {
        console.error('renderPreview failed:', err);
        setPreviewError(String(err));
        return;
      }
      setPhase('calibrating');
      await runCalibrate({
        preview,
        refCrop,
        sampleCrop,
        dngPath,
        sensorWidth,
        sensorHeight,
        knownRefId,
        onPendingSave: p => {
          setEditableName('');
          setPendingSave(p);
          logCalibrateStep('pipeline results shown');
        },
        onCancelFlow: () => navigation.pop(),
      });
    })();
  }, [dngPath, sensorWidth, sensorHeight, knownRefId, navigation]);

  if (previewError) {
    return (
      <ScreenScaffold AppBar={<AppBar title="Calibrate reference (dev)" />}>
        <SafeScrollView>
          <Column padding="md" space="md">
            <Paragraph>{previewError}</Paragraph>
          </Column>
        </SafeScrollView>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold AppBar={<AppBar title="Calibrate reference (dev)" />}>
      <SafeScrollView>
        <Column padding="md" space="md">
          {pendingSave &&
            session.preview &&
            session.refCrop &&
            session.sampleCrop && (
              <CalibrateResultsPanel
                preview={session.preview}
                refCrop={session.refCrop}
                sampleCrop={session.sampleCrop}
                pending={pendingSave}
                nameValue={editableName}
                onNameChange={setEditableName}
                onCancel={() => navigation.pop()}
                onSave={() => {
                  const trimmed = editableName.trim();
                  if (!trimmed) return;
                  const {illuminant, expected} = pendingSave;
                  setPendingSave(null);
                  saveAndConfirm(trimmed, illuminant, expected, () => {
                    navigation.pop();
                  });
                }}
              />
            )}
        </Column>
      </SafeScrollView>
      {!pendingSave && (
        <WorkingOverlay
          text={phase === 'preview' ? 'Loading preview…' : 'Calibrating…'}
        />
      )}
    </ScreenScaffold>
  );
};

// Full-screen busy overlay used while the mount effect is preparing
// the results panel — first while renderPreview runs (~1-4s), then
// while the decode + rank runs (~500ms). Same visual language as
// AndroidRawCaptureScreen's "Capturing…" overlay so the shutter →
// results transition reads as one continuous "working" state to
// the tester.
const WorkingOverlay = ({text}: {text: string}) => (
  <View style={overlayStyles.overlay} pointerEvents="auto">
    <View style={overlayStyles.box}>
      <RNText style={overlayStyles.title}>{text}</RNText>
    </View>
  </View>
);

const overlayStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
});

// Two-column pipeline visualisation for the calibrate flow — mirrors
// the RawColorAnalysisScreen soil-id results section. Each column
// shows the ROI photo → measured average → final colour (known
// linear-sRGB for "Existing ref", computed calibrated linear-sRGB
// for "New ref"). Below the columns: an inline TextInput pre-filled
// with the auto-generated name, plus Cancel / Save buttons. Only
// mounted when pendingSave is non-null; unmounts back to the
// "Calibrate & Save" button on cancel.
const CalibrateResultsPanel = ({
  preview,
  refCrop,
  sampleCrop,
  pending,
  nameValue,
  onNameChange,
  onCancel,
  onSave,
}: {
  preview: {uri: string; width: number; height: number};
  refCrop: RawCrop;
  sampleCrop: RawCrop;
  pending: {
    defaultName: string;
    expected: LinearRgb;
    knownExpected: LinearRgb;
    knownMeasured: LinearRgb;
    newMeasured: LinearRgb;
    knownName: string;
  };
  nameValue: string;
  onNameChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) => {
  // Convert the session's square RawCrops into the PreviewRect shape
  // PipelineColumn wants for its SVG viewBox.
  const cropToRect = (c: RawCrop) => ({
    left: c.left,
    top: c.top,
    width: c.size,
    height: c.size,
  });
  const rgbLine =
    `linear-sRGB: r=${pending.expected.r.toFixed(4)}, ` +
    `g=${pending.expected.g.toFixed(4)}, b=${pending.expected.b.toFixed(4)}`;
  return (
    <>
      <Row space="lg" alignItems="flex-start" justifyContent="center">
        <PipelineColumn
          heading="Existing ref"
          photoRect={cropToRect(refCrop)}
          preview={preview}
          measuredLinearRgb={pending.knownMeasured}
          finalCss={linearRgbToCss(pending.knownExpected)}
          finalLabel={pending.knownName}
        />
        <PipelineColumn
          heading="New ref"
          photoRect={cropToRect(sampleCrop)}
          preview={preview}
          measuredLinearRgb={pending.newMeasured}
          finalCss={linearRgbToCss(pending.expected)}
          finalLabel="calibrated"
        />
      </Row>
      <Paragraph>{rgbLine}</Paragraph>
      <TextInput
        value={nameValue}
        onChangeText={onNameChange}
        placeholder={pending.defaultName}
        autoFocus
        selectTextOnFocus
        style={resultsStyles.input}
        returnKeyType="done"
        onSubmitEditing={onSave}
      />
      <Row space="sm">
        <Box flex={1}>
          <ContainedButton
            label="Cancel"
            onPress={onCancel}
            stretchToFit={true}
          />
        </Box>
        <Box flex={1}>
          <ContainedButton
            label="Save"
            onPress={onSave}
            disabled={!nameValue.trim()}
            stretchToFit={true}
          />
        </Box>
      </Row>
    </>
  );
};

const resultsStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: '#111',
  },
});

// Convert a display-space fractional hint rectangle to a preview-space
// SQUARE RawCrop centered on the hint. The hint is rectangular (the
// yellow overlay box the user framed against), but RawCrop is
// square-only, so we take the largest centered square that fits
// inside the hint's preview-pixel projection. Good default: if the
// user framed their card inside the yellow box, the centered square
// samples the middle of the card and avoids the borders.
const hintRoiToSquareRawCrop = (
  hint: {x: number; y: number; w: number; h: number},
  previewWidth: number,
  previewHeight: number,
): RawCrop => {
  const boxLeft = hint.x * previewWidth;
  const boxTop = hint.y * previewHeight;
  const boxW = hint.w * previewWidth;
  const boxH = hint.h * previewHeight;
  const size = Math.floor(Math.min(boxW, boxH));
  const left = Math.round(boxLeft + (boxW - size) / 2);
  const top = Math.round(boxTop + (boxH - size) / 2);
  return {top, left, size};
};

// Decode both ROIs — same coord math as RawColorAnalysisScreen's
// decodeCrops. Kept as a local copy for now; if a third caller appears
// we'll extract the shared helper.
const decodeCalibrationCrops = async ({
  dngPath,
  sensorWidth,
  sensorHeight,
  preview,
  knownCrop,
  newCrop,
}: {
  dngPath: string;
  sensorWidth: number;
  sensorHeight: number;
  preview: {width: number; height: number};
  knownCrop: RawCrop;
  newCrop: RawCrop;
}): Promise<{knownMeasured: LinearRgb; newMeasured: LinearRgb}> => {
  const previewIsPortrait = preview.width < preview.height;
  const rawSensorIsPortrait = sensorWidth < sensorHeight;
  const effectiveSensorWidth =
    previewIsPortrait === rawSensorIsPortrait ? sensorWidth : sensorHeight;
  const effectiveSensorHeight =
    previewIsPortrait === rawSensorIsPortrait ? sensorHeight : sensorWidth;
  const scaleX = effectiveSensorWidth / preview.width;
  const scaleY = effectiveSensorHeight / preview.height;
  const toSensor = (c: RawCrop) => ({
    x: Math.round(c.left * scaleX),
    y: Math.round(c.top * scaleY),
    w: Math.round(c.size * scaleX),
    h: Math.round(c.size * scaleY),
  });
  const knownSensor = toSensor(knownCrop);
  const newSensor = toSensor(newCrop);
  console.log(
    `Calibrate coords: preview=${preview.width}x${preview.height} scaleX=${scaleX.toFixed(3)} scaleY=${scaleY.toFixed(3)}`,
  );
  console.log(
    `  knownROI(sensor)=${JSON.stringify(knownSensor)} newROI(sensor)=${JSON.stringify(newSensor)}`,
  );
  const [knownMeasured, newMeasured] = await DngDecoderHybrid.decodeDngRois(
    dngPath,
    [knownSensor, newSensor],
  );
  console.log(
    `  decoded known=(${knownMeasured.r.toFixed(3)},${knownMeasured.g.toFixed(3)},${knownMeasured.b.toFixed(3)}) ` +
      `new=(${newMeasured.r.toFixed(3)},${newMeasured.g.toFixed(3)},${newMeasured.b.toFixed(3)})`,
  );
  return {knownMeasured, newMeasured};
};

// Compute the calibrated linear-sRGB and pre-fill an auto-name, then
// open the in-screen naming Modal so the user can edit + save. The
// old Alert.prompt-based flow was iOS-only (Alert.prompt no-ops on
// Android — the save silently stalled with the screen stuck at
// "Working…"). Modal + TextInput works on both platforms.
//
// Auto-name format (used as the modal's default):
//   "{knownRefName} recal {yyyymmdd-hhmm}"
// e.g. "WhiBal G7 recal 20260825-1637". Illuminant pulled from the
// Session Context MMKV (RawColorTools' munsellSession.illuminant) if
// set, otherwise blank.
const buildPendingSave = (
  known: AvailableReference,
  knownMeasured: LinearRgb,
  newMeasured: LinearRgb,
): {
  defaultName: string;
  illuminant: string | undefined;
  expected: LinearRgb;
  knownExpected: LinearRgb;
  knownMeasured: LinearRgb;
  newMeasured: LinearRgb;
  knownName: string;
} => {
  const expected = computeCalibratedReference(
    knownMeasured,
    known.linearRgb,
    newMeasured,
  );
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const defaultName = `${known.name} recal ${stamp}`;
  const illuminant =
    kvStorage.getString('munsellSession.illuminant') || undefined;
  return {
    defaultName,
    illuminant,
    expected,
    knownExpected: known.linearRgb,
    knownMeasured,
    newMeasured,
    knownName: known.name,
  };
};

// Runs the decode → rank → pending-save-state build for the auto-run
// calibrate flow. Called from the CalibrateReferenceScreen mount
// effect right after seeds are set. Takes explicit crops (not from
// session state) so it can run inside the same async block that just
// wrote them — session updates via useSyncExternalStore haven't
// flushed by the time we get here.
//
// Result paths:
//   * knownRefId resolves            → auto-pick, call onPendingSave
//   * knownRefId missing / stale     → top-pick alert asks user to
//                                      confirm; Cancel → onCancelFlow
//   * ranked list empty              → alert + onCancelFlow
//   * decode throws                  → alert + onCancelFlow
const runCalibrate = async (args: {
  preview: {uri: string; width: number; height: number};
  refCrop: RawCrop;
  sampleCrop: RawCrop;
  dngPath: string;
  sensorWidth: number;
  sensorHeight: number;
  knownRefId: string | undefined;
  onPendingSave: (p: ReturnType<typeof buildPendingSave>) => void;
  onCancelFlow: () => void;
}): Promise<void> => {
  const {
    preview,
    refCrop,
    sampleCrop,
    dngPath,
    sensorWidth,
    sensorHeight,
    knownRefId,
    onPendingSave,
    onCancelFlow,
  } = args;
  logCalibrateStep('decode start');
  let decoded: {knownMeasured: LinearRgb; newMeasured: LinearRgb};
  try {
    decoded = await decodeCalibrationCrops({
      dngPath,
      sensorWidth,
      sensorHeight,
      preview,
      knownCrop: refCrop,
      newCrop: sampleCrop,
    });
    logCalibrateStep('decode end');
  } catch (err) {
    console.error('Calibrate decode failed:', err);
    Alert.alert('Calibrate failed', String(err), [
      {text: 'OK', onPress: onCancelFlow},
    ]);
    return;
  }

  const customRefs = listCustomReferences();
  const ranked = rankReferences(decoded.knownMeasured, customRefs);
  if (ranked.length === 0) {
    Alert.alert(
      'No references available',
      'No builtin or custom references to match against. Save aborted.',
      [{text: 'OK', onPress: onCancelFlow}],
    );
    return;
  }
  console.log(
    'Calibrate ranked matches for known ROI (top-first):\n' +
      ranked
        .map(
          (r, i) =>
            `  ${i + 1}. ${r.name} — ΔE ${r.deltaE.toFixed(1)} ` +
            `(${Math.round(r.confidence * 100)}%)`,
        )
        .join('\n'),
  );
  let picked: AvailableReference | undefined;
  if (knownRefId) {
    picked = listAvailableReferences(customRefs).find(r => r.id === knownRefId);
    if (!picked) {
      console.warn(
        `knownRefId "${knownRefId}" no longer resolves (deleted custom?); ` +
          'falling back to top-pick prompt',
      );
    }
  }
  if (picked) {
    const rank = ranked.findIndex(r => r.id === picked!.id) + 1;
    const you = ranked.find(r => r.id === picked!.id);
    console.log(
      `Using pre-selected ref "${picked.name}" ` +
        `(rank ${rank}/${ranked.length}, ` +
        `ΔE ${you?.deltaE.toFixed(1) ?? '?'} vs measured)`,
    );
    onPendingSave(
      buildPendingSave(picked, decoded.knownMeasured, decoded.newMeasured),
    );
    return;
  }
  // Fallback: no valid pre-selection → confirm top match.
  const top = ranked[0];
  const runnerUpText =
    ranked.length > 1
      ? `\n\nRunner-up: ${ranked[1].name} (ΔE ${ranked[1].deltaE.toFixed(1)})`
      : '';
  Alert.alert(
    `Top match: ${top.name}`,
    `ΔE ${top.deltaE.toFixed(1)}, ${Math.round(top.confidence * 100)}% ` +
      `confidence. Full ranking in Metro logs.${runnerUpText}`,
    [
      {text: 'Cancel', style: 'cancel' as const, onPress: onCancelFlow},
      {
        text: 'Use this ref',
        onPress: () => {
          onPendingSave(
            buildPendingSave(top, decoded.knownMeasured, decoded.newMeasured),
          );
        },
      },
    ],
    {cancelable: true, onDismiss: onCancelFlow},
  );
};

const saveAndConfirm = (
  name: string,
  calibratedUnder: string | undefined,
  linearRgb: LinearRgb,
  onDone: () => void,
): void => {
  try {
    const saved = saveCustomReference({name, linearRgb, calibratedUnder});
    console.log(
      `Calibrate saved: id=${saved.id} name="${saved.name}" ` +
        `linearRgb=(${linearRgb.r.toFixed(4)},${linearRgb.g.toFixed(4)},${linearRgb.b.toFixed(4)}) ` +
        `calibratedUnder=${JSON.stringify(calibratedUnder)}`,
    );
    const rgbLine =
      `linear-sRGB: r=${linearRgb.r.toFixed(4)}, ` +
      `g=${linearRgb.g.toFixed(4)}, b=${linearRgb.b.toFixed(4)}`;
    Alert.alert(
      'Reference saved',
      `"${name}" is now in your custom references library.\n\n${rgbLine}`,
      [{text: 'OK', onPress: () => onDone()}],
    );
  } catch (err) {
    console.error('Calibrate save failed:', err);
    Alert.alert('Save failed', String(err), [
      {text: 'OK', onPress: () => onDone()},
    ]);
  }
};
