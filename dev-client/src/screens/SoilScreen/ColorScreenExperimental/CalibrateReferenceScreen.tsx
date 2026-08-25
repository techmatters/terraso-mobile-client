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
import {Alert, Image, StyleSheet, View} from 'react-native';

import {DngDecoderHybrid} from 'dng-decoder';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
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
  computeCalibratedReference,
  LinearRgb,
  RankedReference,
  rankReferences,
} from 'terraso-mobile-client/model/color/getColorFromLinearRgb';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {
  CALIBRATE_EXISTING_ROI,
  CALIBRATE_NEW_ROI,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/calibrateRois';
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
}: CalibrateReferenceProps) => {
  const navigation = useNavigation();
  const session = useRawAnalysisSession();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        // that fits inside the hint rectangle, centered on it.
        setRawAnalysisCrop(
          'reference',
          hintRoiToSquareRawCrop(CALIBRATE_EXISTING_ROI, p.width, p.height),
        );
        setRawAnalysisCrop(
          'sample',
          hintRoiToSquareRawCrop(CALIBRATE_NEW_ROI, p.width, p.height),
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

    // Rank existing references against the measured known-ref ROI.
    // rankReferences merges builtins + custom; on a fresh device the
    // list is ~7 candidates plus Cancel, which is more than Android's
    // native AlertDialog can display (max 3 buttons — extras silently
    // drop the whole dialog). Instead of a picker, auto-pick the top
    // match and dump the full ranking to Metro so the tester can
    // eyeball whether the top pick makes sense. If it's wrong the
    // tester cancels the name prompt and re-shoots (usually a framing
    // issue → the wrong physical card ended up in the "existing" ROI).
    const ranked = rankReferences(
      decoded.knownMeasured,
      listCustomReferences(),
    );
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
            promptNameAndSave(
              top,
              decoded.knownMeasured,
              decoded.newMeasured,
              () => {
                setBusy(false);
                navigation.pop();
              },
            );
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
    navigation,
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
        </Column>
      </SafeScrollView>
    </ScreenScaffold>
  );
};

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

// Prompt for name (required) + illuminant note (optional), then save
// to MMKV. iOS-only path — Alert.prompt is not implemented on Android;
// the whole RAW pipeline is iOS-only anyway at time of writing.
const promptNameAndSave = (
  known: RankedReference,
  knownMeasured: LinearRgb,
  newMeasured: LinearRgb,
  onDone: () => void,
): void => {
  const expected = computeCalibratedReference(
    knownMeasured,
    known.linearRgb,
    newMeasured,
  );
  const rgbLabel = `r=${expected.r.toFixed(4)}, g=${expected.g.toFixed(4)}, b=${expected.b.toFixed(4)}`;
  Alert.prompt(
    'Name this reference',
    `Computed linear-sRGB:\n${rgbLabel}\n\n` +
      `Paste these values into LINEAR_REFERENCES ` +
      `(src/model/color/getColorFromLinearRgb.ts) to promote this ` +
      `custom reference to a builtin.\n\n` +
      `Enter a name for this reference:`,
    [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => onDone(),
      },
      {
        text: 'Next',
        onPress: (name?: string) => {
          const trimmed = (name ?? '').trim();
          if (!trimmed) {
            Alert.alert(
              'Name required',
              'Please enter a name for the reference.',
              [{text: 'OK', onPress: () => onDone()}],
            );
            return;
          }
          Alert.prompt(
            'Illuminant note (optional)',
            'Free-form description of the lighting you used (e.g. "kitchen daylight ~4pm cloudy"). Leave blank to skip.',
            [
              {
                text: 'Skip',
                onPress: () => {
                  saveAndConfirm(trimmed, undefined, expected, onDone);
                },
              },
              {
                text: 'Save',
                onPress: (note?: string) => {
                  const noteTrimmed = (note ?? '').trim();
                  saveAndConfirm(
                    trimmed,
                    noteTrimmed || undefined,
                    expected,
                    onDone,
                  );
                },
              },
            ],
            'plain-text',
          );
        },
      },
    ],
    'plain-text',
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
