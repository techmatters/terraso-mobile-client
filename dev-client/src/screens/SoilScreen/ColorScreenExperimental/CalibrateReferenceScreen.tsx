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

import {useCallback, useEffect, useState} from 'react';
import {Alert, Image, StyleSheet, TextInput, View} from 'react-native';

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
import {
  linearRgbToCss,
  PipelineColumn,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/pipelineColumn';
import {
  RawAnalysisRole,
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
  const [busy, setBusy] = useState(false);
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

  useEffect(() => {
    resetRawAnalysisSession(null);
    (async () => {
      try {
        const p = await DngDecoderHybrid.renderPreview(dngPath, 1200);
        resetRawAnalysisSession({
          uri: p.uri,
          width: p.width,
          height: p.height,
        });
        // Auto-seed both crops from the on-camera hint boxes so the
        // user can go straight to "Calibrate & Save" — assuming they
        // framed the cards inside the yellow overlay boxes on capture.
        // The two SelectButton entries remain functional as an escape
        // hatch: tapping either re-opens RawCropScreen for a manual
        // pan/pinch pick, which then overrides the seed. A square is
        // used (RawCrop is single-sided) — take the largest square
        // that fits inside the hint rectangle, centered on it. Uses
        // the SAME preset the user picked with +/- on the capture
        // screen, so a small preset seeds smaller crops.
        const preset = getActiveRoiPreset();
        setRawAnalysisCrop(
          'reference',
          hintRoiToSquareRawCrop(preset.ref, p.width, p.height),
        );
        setRawAnalysisCrop(
          'sample',
          hintRoiToSquareRawCrop(preset.sample, p.width, p.height),
        );
      } catch (err) {
        console.error('renderPreview failed:', err);
        setPreviewError(String(err));
      }
    })();
  }, [dngPath]);

  const gotoCrop = useCallback(
    (role: RawAnalysisRole) => {
      const titleOverride =
        role === 'reference'
          ? 'Existing ref (already in library)'
          : 'New ref (to calibrate)';
      const descriptionOverride =
        role === 'reference'
          ? 'Frame the EXISTING reference card — the one already in your library. Its known color drives the calibration for the new card. Pan to move, pinch to zoom.'
          : "Frame the NEW reference card — the one you want to add to your library. Its color will be computed from the existing ref's known value. Pan to move, pinch to zoom.";
      navigation.navigate('RAW_COLOR_CROP_EXPERIMENTAL', {
        role,
        titleOverride,
        descriptionOverride,
      });
    },
    [navigation],
  );

  const onCalibrate = useCallback(async () => {
    if (!session.refCrop || !session.sampleCrop || !session.preview) return;
    setBusy(true);
    let decoded: {knownMeasured: LinearRgb; newMeasured: LinearRgb};
    try {
      decoded = await decodeCalibrationCrops({
        dngPath,
        sensorWidth,
        sensorHeight,
        preview: session.preview,
        knownCrop: session.refCrop,
        newCrop: session.sampleCrop,
      });
    } catch (err) {
      console.error('Calibrate decode failed:', err);
      Alert.alert('Calibrate failed', String(err));
      setBusy(false);
      return;
    }

    // Two paths:
    //   1. knownRefId set (normal flow — dropdown picked on RawColorTools):
    //      look it up directly, log the ranked comparison for sanity,
    //      go straight to name prompt.
    //   2. knownRefId missing / stale (deep-link, deleted custom):
    //      fall back to top-pick alert as a safety net.
    const customRefs = listCustomReferences();
    const ranked = rankReferences(decoded.knownMeasured, customRefs);
    if (ranked.length === 0) {
      Alert.alert(
        'No references available',
        'No builtin or custom references to match against. Save aborted.',
        [{text: 'OK', onPress: () => setBusy(false)}],
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
      picked = listAvailableReferences(customRefs).find(
        r => r.id === knownRefId,
      );
      if (!picked) {
        console.warn(
          `knownRefId "${knownRefId}" no longer resolves (deleted custom?); ` +
            'falling back to top-pick prompt',
        );
      }
    }
    if (picked) {
      // Note where the user's pick landed in the ranking so a
      // "picked #4 but expected #1" mismatch is obvious in the log.
      const rank = ranked.findIndex(r => r.id === picked!.id) + 1;
      const you = ranked.find(r => r.id === picked!.id);
      console.log(
        `Using pre-selected ref "${picked.name}" ` +
          `(rank ${rank}/${ranked.length}, ` +
          `ΔE ${you?.deltaE.toFixed(1) ?? '?'} vs measured)`,
      );
      const p = buildPendingSave(
        picked,
        decoded.knownMeasured,
        decoded.newMeasured,
      );
      setEditableName(p.defaultName);
      setPendingSave(p);
      return;
    }
    // Fallback: no valid pre-selection → show top match with confirm.
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
        {
          text: 'Cancel',
          style: 'cancel' as const,
          onPress: () => setBusy(false),
        },
        {
          text: 'Use this ref',
          onPress: () => {
            const p = buildPendingSave(
              top,
              decoded.knownMeasured,
              decoded.newMeasured,
            );
            setEditableName(p.defaultName);
            setPendingSave(p);
          },
        },
      ],
      {cancelable: true, onDismiss: () => setBusy(false)},
    );
  }, [
    session.refCrop,
    session.sampleCrop,
    session.preview,
    dngPath,
    sensorWidth,
    sensorHeight,
    knownRefId,
  ]);

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
          <Paragraph>
            Both crops are pre-set from the on-camera yellow hint boxes — tap
            "Calibrate & Save" if the framing was good. To fine-tune either
            crop, tap "Existing ref" or "New ref" to open the pan/pinch picker.
          </Paragraph>
          <PreviewThumbnail
            uri={session.preview?.uri}
            aspectRatio={
              session.preview
                ? session.preview.width / session.preview.height
                : 3 / 4
            }
          />
          <Row space="sm">
            <SelectButton
              label="Existing ref"
              selected={!!session.refCrop}
              onPress={() => gotoCrop('reference')}
              disabled={!session.preview}
            />
            <SelectButton
              label="New ref"
              selected={!!session.sampleCrop}
              onPress={() => gotoCrop('sample')}
              disabled={!session.preview}
            />
          </Row>
          {!pendingSave && (
            <ContainedButton
              label={busy ? 'Working…' : 'Calibrate & Save'}
              onPress={onCalibrate}
              disabled={
                !session.preview ||
                !session.refCrop ||
                !session.sampleCrop ||
                busy
              }
            />
          )}
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
                onCancel={() => {
                  setPendingSave(null);
                  setBusy(false);
                }}
                onSave={() => {
                  const trimmed = editableName.trim();
                  if (!trimmed) return;
                  const {illuminant, expected} = pendingSave;
                  setPendingSave(null);
                  saveAndConfirm(trimmed, illuminant, expected, () => {
                    setBusy(false);
                    navigation.pop();
                  });
                }}
              />
            )}
        </Column>
      </SafeScrollView>
    </ScreenScaffold>
  );
};

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

const PreviewThumbnail = ({
  uri,
  aspectRatio,
}: {
  uri: string | undefined;
  aspectRatio: number;
}) => (
  <Box
    width="100%"
    aspectRatio={aspectRatio}
    backgroundColor="grey.900"
    overflow="hidden">
    {uri && (
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={{uri}}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
        />
      </View>
    )}
  </Box>
);

const SelectButton = ({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}) => (
  <Box flex={1}>
    <ContainedButton
      label={`${selected ? '✓ ' : ''}${label}`}
      onPress={onPress}
      disabled={disabled}
      stretchToFit={true}
    />
  </Box>
);

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
