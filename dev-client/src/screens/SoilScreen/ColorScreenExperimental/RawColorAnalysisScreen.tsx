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

import {trackSoilObservation} from 'terraso-mobile-client/analytics/soilObservationTracking';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {
  Box,
  Column,
  Paragraph,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollView} from 'terraso-mobile-client/components/safeview/SafeScrollView';
import {munsellToString} from 'terraso-mobile-client/model/color/colorConversions';
import {
  getColorFromLinearRgb,
  LinearReferenceKey,
  LinearRgb,
  rankReferences,
} from 'terraso-mobile-client/model/color/getColorFromLinearRgb';
import {updateDepthDependentSoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {
  RawAnalysisRole,
  RawCrop,
  resetRawAnalysisSession,
  useRawAnalysisSession,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/rawAnalysisSession';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {useDispatch} from 'terraso-mobile-client/store';

export type RawColorAnalysisProps = {
  /** file:// URI to the captured DNG. */
  dngPath: string;
  /**
   * Full sensor dimensions from the vision-camera Photo object. Used to
   * scale ROI coordinates picked in preview space up to sensor space
   * before calling decodeDngRois.
   */
  sensorWidth: number;
  sensorHeight: number;
  pitProps: SoilPitInputScreenProps;
};

// Analysis home for the experimental RAW capture path. User selects
// two crops sequentially — reference card, then soil sample — each
// using the pan/pinch-square UX (RawCropScreen), parallel to how the
// production JPEG-path ColorAnalysisHomeScreen dispatches to
// ColorCropReferenceScreen + ColorCropSoilScreen. Selected crops are
// stored in the module-scope rawAnalysisSession; when both are set,
// Analyze becomes enabled. Analyze scales crops from preview coords
// to sensor coords, decodes via DngDecoderHybrid, runs
// getColorFromLinearRgb, dispatches to Redux, pops.
export const RawColorAnalysisScreen = ({
  dngPath,
  sensorWidth,
  sensorHeight,
  pitProps,
}: RawColorAnalysisProps) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const session = useRawAnalysisSession();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Render the preview once (per capture). Cache the result in the
  // session so navigating between the crop screens doesn't re-render.
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
      navigation.navigate('RAW_COLOR_CROP_EXPERIMENTAL', {role});
    },
    [navigation],
  );

  const onAnalyze = useCallback(async () => {
    if (!session.refCrop || !session.sampleCrop || !session.preview) return;
    setAnalyzing(true);
    let decoded: {card: LinearRgb; sample: LinearRgb};
    try {
      decoded = await decodeCrops({
        dngPath,
        sensorWidth,
        sensorHeight,
        preview: session.preview,
        refCrop: session.refCrop,
        sampleCrop: session.sampleCrop,
      });
    } catch (err) {
      console.error('RAW decode failed:', err);
      Alert.alert('Analyze failed', String(err));
      setAnalyzing(false);
      return;
    }

    // Rank references against the measured card, then present a picker
    // so the user confirms which physical card they framed. Auto-pick
    // the top-ranked reference in the alert's default position.
    const ranked = rankReferences(decoded.card);
    const finalizeWith = async (referenceKey: LinearReferenceKey) => {
      try {
        const munsell = await finalizeAnalysis({
          card: decoded.card,
          sample: decoded.sample,
          referenceKey,
          pitProps,
          dispatch,
        });
        Alert.alert(
          'RAW analysis complete',
          `Soil color saved: ${munsell}\n\nReturning to Color screen.`,
          [{text: 'OK', onPress: () => navigation.pop()}],
        );
      } catch (err) {
        console.error('RAW analyze failed:', err);
        Alert.alert('Analyze failed', String(err));
      } finally {
        setAnalyzing(false);
      }
    };

    Alert.alert(
      'Choose reference card',
      'Which reference did you frame? Ranked by closest color match to the measured card.',
      [
        ...ranked.map(r => ({
          text: `${r.name}  (ΔE ${r.deltaE.toFixed(1)}, ${Math.round(
            r.confidence * 100,
          )}%)`,
          onPress: () => {
            finalizeWith(r.key);
          },
        })),
        {
          text: 'Cancel',
          style: 'cancel' as const,
          onPress: () => setAnalyzing(false),
        },
      ],
      {cancelable: true, onDismiss: () => setAnalyzing(false)},
    );
  }, [
    session.refCrop,
    session.sampleCrop,
    session.preview,
    dngPath,
    sensorWidth,
    sensorHeight,
    pitProps,
    dispatch,
    navigation,
  ]);

  if (previewError) {
    return (
      <ScreenScaffold AppBar={<AppBar title="RAW analysis (experimental)" />}>
        <SafeScrollView>
          <Column padding="md" space="md">
            <Text variant="body1" bold>
              Could not load preview
            </Text>
            <Paragraph>{previewError}</Paragraph>
          </Column>
        </SafeScrollView>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold AppBar={<AppBar title="RAW analysis (experimental)" />}>
      <SafeScrollView>
        <Column padding="md" space="md">
          <Paragraph>
            Select the reference card region, then the soil sample region.
            Pan/pinch inside each crop screen to frame precisely.
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
              label="Reference card"
              selected={!!session.refCrop}
              onPress={() => gotoCrop('reference')}
              disabled={!session.preview}
            />
            <SelectButton
              label="Soil sample"
              selected={!!session.sampleCrop}
              onPress={() => gotoCrop('sample')}
              disabled={!session.preview}
            />
          </Row>
          <ContainedButton
            label={analyzing ? 'Analyzing…' : 'Analyze'}
            onPress={onAnalyze}
            disabled={
              !session.preview ||
              !session.refCrop ||
              !session.sampleCrop ||
              analyzing
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

// Scale preview-space crops up to sensor-space ROIs and call
// decodeDngRois. Returns the two per-ROI linear-sRGB averages so the
// caller can rank references before choosing which one to correct
// against.
const decodeCrops = async ({
  dngPath,
  sensorWidth,
  sensorHeight,
  preview,
  refCrop,
  sampleCrop,
}: {
  dngPath: string;
  sensorWidth: number;
  sensorHeight: number;
  preview: {width: number; height: number};
  refCrop: RawCrop;
  sampleCrop: RawCrop;
}): Promise<{card: LinearRgb; sample: LinearRgb}> => {
  // Vision-camera reports photo.width/height in the DNG's *pre-orientation*
  // dimensions — iPhone in portrait writes a landscape 4032×3024 DNG with
  // Orientation=6 (rotate 90 CW). CIRAWFilter honors the orientation tag,
  // so its outputImage — and our rendered preview PNG — comes back rotated
  // to portrait 3024×4032. Detect the orientation mismatch from the aspect
  // ratios and swap dims so preview→sensor scaling matches the coord
  // space decodeDngRois actually uses (which is CIRAWFilter's extent, i.e.
  // the same orientation as the preview).
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
  const refSensor = toSensor(refCrop);
  const sampleSensor = toSensor(sampleCrop);
  // TEMPORARY debug — trace every coordinate transform in the RAW
  // analysis pipeline so we can see whether wrong ROIs are being sampled.
  console.log(
    `RAW analyze coords: preview=${preview.width}x${preview.height} sensor(raw)=${sensorWidth}x${sensorHeight} sensor(effective)=${effectiveSensorWidth}x${effectiveSensorHeight} scaleX=${scaleX.toFixed(3)} scaleY=${scaleY.toFixed(3)}`,
  );
  console.log(
    `  refCrop(preview)=${JSON.stringify(refCrop)} → refROI(sensor)=${JSON.stringify(refSensor)}`,
  );
  console.log(
    `  sampleCrop(preview)=${JSON.stringify(sampleCrop)} → sampleROI(sensor)=${JSON.stringify(sampleSensor)}`,
  );
  const [card, sample] = await DngDecoderHybrid.decodeDngRois(dngPath, [
    refSensor,
    sampleSensor,
  ]);
  console.log(
    `  decoded card=(${card.r.toFixed(3)},${card.g.toFixed(3)},${card.b.toFixed(3)}) ` +
      `sample=(${sample.r.toFixed(3)},${sample.g.toFixed(3)},${sample.b.toFixed(3)})`,
  );
  return {card, sample};
};

// Apply the WB correction against the chosen reference, dispatch to
// Redux, and return a display-ready Munsell string for the
// confirmation Alert.
const finalizeAnalysis = async ({
  card,
  sample,
  referenceKey,
  pitProps,
  dispatch,
}: {
  card: LinearRgb;
  sample: LinearRgb;
  referenceKey: LinearReferenceKey;
  pitProps: SoilPitInputScreenProps;
  dispatch: ReturnType<typeof useDispatch>;
}): Promise<string> => {
  const colorResult = getColorFromLinearRgb(card, sample, referenceKey);
  const dispatched =
    'result' in colorResult
      ? colorResult.result
      : colorResult.nearestValidResult;
  if (!dispatched) {
    throw new Error('Munsell match produced no dispatchable result');
  }
  dispatch(
    updateDepthDependentSoilData({
      siteId: pitProps.siteId,
      depthInterval: pitProps.depthInterval.depthInterval,
      colorHue: dispatched.colorHue,
      colorValue: dispatched.colorValue,
      colorChroma: dispatched.colorChroma,
      colorPhotoUsed: true,
    }),
  );
  trackSoilObservation({
    input_type: 'soil_color',
    input_method: 'photo',
    site_id: pitProps.siteId,
    depthInterval: pitProps.depthInterval.depthInterval,
  });
  const munsellText = munsellToString(dispatched);
  console.log(
    `RAW finalize dispatched: ${munsellText} using reference=${referenceKey} ` +
      `card=(${card.r.toFixed(3)},${card.g.toFixed(3)},${card.b.toFixed(3)}) ` +
      `sample=(${sample.r.toFixed(3)},${sample.g.toFixed(3)},${sample.b.toFixed(3)})`,
  );
  return munsellText;
};
