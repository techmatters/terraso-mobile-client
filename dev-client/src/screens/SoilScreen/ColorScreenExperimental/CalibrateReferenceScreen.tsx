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
  RawAnalysisRole,
  RawCrop,
  resetRawAnalysisSession,
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
      } catch (err) {
        console.error('renderPreview failed:', err);
        setPreviewError(String(err));
      }
    })();
  }, [dngPath]);

  const gotoCrop = useCallback(
    (role: RawAnalysisRole) => {
      const titleOverride =
        role === 'reference' ? 'Known reference' : 'New reference';
      const descriptionOverride =
        role === 'reference'
          ? 'Frame the known reference (a card already in your library). Pan to move, pinch to zoom.'
          : 'Frame the new reference you want to calibrate. Pan to move, pinch to zoom.';
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

    // Rank existing references against the measured known-ref ROI so
    // the user picks (and implicitly validates) which stored card they
    // framed. Top pick is auto-labeled — if the tester expected a
    // different one, this catches the mismatch before it corrupts the
    // stored calibration.
    const ranked = rankReferences(
      decoded.knownMeasured,
      listCustomReferences(),
    );
    Alert.alert(
      'Which known reference did you frame?',
      'Ranked by closest color match. Pick the physical card in the "Known" ROI.',
      [
        ...ranked.map(r => ({
          text: `${r.name}  (ΔE ${r.deltaE.toFixed(1)}, ${Math.round(
            r.confidence * 100,
          )}%)`,
          onPress: () => {
            promptNameAndSave(
              r,
              decoded.knownMeasured,
              decoded.newMeasured,
              () => {
                setBusy(false);
                navigation.pop();
              },
            );
          },
        })),
        {
          text: 'Cancel',
          style: 'cancel' as const,
          onPress: () => setBusy(false),
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
            Frame a known reference card AND a new uncalibrated card in the same
            shot. Select each ROI, then tap Calibrate to compute the new card's
            linear-sRGB and save it.
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
              label="Known reference"
              selected={!!session.refCrop}
              onPress={() => gotoCrop('reference')}
              disabled={!session.preview}
            />
            <SelectButton
              label="New reference"
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
