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

import {useCallback, useEffect, useRef, useState} from 'react';
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
import {listCustomReferences} from 'terraso-mobile-client/model/color/customReferences';
import {
  getColorFromLinearRgb,
  LinearRgb,
  RankedReference,
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
  /**
   * When set, skip the manual crop-picker step and run analysis against
   * the given fractional ROIs directly. Used by the RAW-Live capture
   * flow — the user placed the card + sample into the overlay boxes at
   * shot time, so re-cropping would just repeat that positioning.
   * Fractions are in the display coord system of the captured DNG (same
   * space the CIRAWFilter-rendered preview lives in), i.e. x, y, w, h
   * all in [0, 1].
   */
  preSelectedDisplayRois?: {
    ref: {x: number; y: number; w: number; h: number};
    sample: {x: number; y: number; w: number; h: number};
  };
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
  preSelectedDisplayRois,
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

  // Both entry points (manual crop-picker Analyze button + auto-run
  // from preSelectedDisplayRois) funnel here. Callers pass explicit
  // preview-space rects so this doesn't have to branch on the source.
  const runAnalyze = useCallback(
    async (
      preview: {width: number; height: number},
      refRect: PreviewRect,
      sampleRect: PreviewRect,
    ) => {
      setAnalyzing(true);
      let decoded: {card: LinearRgb; sample: LinearRgb};
      try {
        decoded = await decodeRects({
          dngPath,
          sensorWidth,
          sensorHeight,
          preview,
          refRect,
          sampleRect,
        });
      } catch (err) {
        console.error('RAW decode failed:', err);
        Alert.alert('Analyze failed', String(err));
        setAnalyzing(false);
        return;
      }

      // Rank predefined + user-calibrated references against the
      // measured card, then present a picker so the user confirms which
      // physical card they framed. Auto-pick the top-ranked reference in
      // the alert's default position.
      const ranked = rankReferences(decoded.card, listCustomReferences());
      const finalizeWith = async (chosen: RankedReference) => {
        try {
          const munsell = await finalizeAnalysis({
            card: decoded.card,
            sample: decoded.sample,
            reference: chosen,
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
              finalizeWith(r);
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
    },
    [dngPath, sensorWidth, sensorHeight, pitProps, dispatch, navigation],
  );

  // Manual-picker Analyze button — pulls crops from the session and
  // converts each square RawCrop into a PreviewRect for runAnalyze.
  const onAnalyze = useCallback(() => {
    if (!session.refCrop || !session.sampleCrop || !session.preview) return;
    const cropToRect = (c: RawCrop): PreviewRect => ({
      left: c.left,
      top: c.top,
      width: c.size,
      height: c.size,
    });
    runAnalyze(
      session.preview,
      cropToRect(session.refCrop),
      cropToRect(session.sampleCrop),
    );
  }, [session.refCrop, session.sampleCrop, session.preview, runAnalyze]);

  // Auto-analyze path for RAW-Live: as soon as the preview loads,
  // convert the fractional display ROIs into preview-space rects and
  // fire runAnalyze once. autoRanRef guards against re-firing on
  // re-renders (preview identity is stable, but React can still re-run
  // effects on fast-refresh / dev cycles).
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (!preSelectedDisplayRois) return;
    if (autoRanRef.current) return;
    if (!session.preview) return;
    autoRanRef.current = true;
    const toRect = (roi: {
      x: number;
      y: number;
      w: number;
      h: number;
    }): PreviewRect => ({
      left: roi.x * session.preview!.width,
      top: roi.y * session.preview!.height,
      width: roi.w * session.preview!.width,
      height: roi.h * session.preview!.height,
    });
    runAnalyze(
      session.preview,
      toRect(preSelectedDisplayRois.ref),
      toRect(preSelectedDisplayRois.sample),
    );
  }, [preSelectedDisplayRois, session.preview, runAnalyze]);

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
            {preSelectedDisplayRois
              ? 'Analyzing the reference card and soil sample regions you framed in the overlay…'
              : 'Select the reference card region, then the soil sample region. Pan/pinch inside each crop screen to frame precisely.'}
          </Paragraph>
          <PreviewThumbnail
            uri={session.preview?.uri}
            aspectRatio={
              session.preview
                ? session.preview.width / session.preview.height
                : 3 / 4
            }
          />
          {!preSelectedDisplayRois && (
            <>
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
            </>
          )}
          {preSelectedDisplayRois && analyzing && (
            <Paragraph>Analyzing…</Paragraph>
          )}
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

type PreviewRect = {left: number; top: number; width: number; height: number};

// Scale preview-space rectangles up to sensor-space ROIs and call
// decodeDngRois. Returns the two per-ROI linear-sRGB averages so the
// caller can rank references before choosing which one to correct
// against.
const decodeRects = async ({
  dngPath,
  sensorWidth,
  sensorHeight,
  preview,
  refRect,
  sampleRect,
}: {
  dngPath: string;
  sensorWidth: number;
  sensorHeight: number;
  preview: {width: number; height: number};
  refRect: PreviewRect;
  sampleRect: PreviewRect;
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
  const toSensor = (r: PreviewRect) => ({
    x: Math.round(r.left * scaleX),
    y: Math.round(r.top * scaleY),
    w: Math.round(r.width * scaleX),
    h: Math.round(r.height * scaleY),
  });
  const refSensor = toSensor(refRect);
  const sampleSensor = toSensor(sampleRect);
  // TEMPORARY debug — trace every coordinate transform in the RAW
  // analysis pipeline so we can see whether wrong ROIs are being sampled.
  console.log(
    `RAW analyze coords: preview=${preview.width}x${preview.height} sensor(raw)=${sensorWidth}x${sensorHeight} sensor(effective)=${effectiveSensorWidth}x${effectiveSensorHeight} scaleX=${scaleX.toFixed(3)} scaleY=${scaleY.toFixed(3)}`,
  );
  console.log(
    `  refRect(preview)=${JSON.stringify(refRect)} → refROI(sensor)=${JSON.stringify(refSensor)}`,
  );
  console.log(
    `  sampleRect(preview)=${JSON.stringify(sampleRect)} → sampleROI(sensor)=${JSON.stringify(sampleSensor)}`,
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
  reference,
  pitProps,
  dispatch,
}: {
  card: LinearRgb;
  sample: LinearRgb;
  reference: RankedReference;
  pitProps: SoilPitInputScreenProps;
  dispatch: ReturnType<typeof useDispatch>;
}): Promise<string> => {
  const colorResult = getColorFromLinearRgb(card, sample, reference.linearRgb);
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
    `RAW finalize dispatched: ${munsellText} using reference=${reference.id} (${reference.name}) ` +
      `card=(${card.r.toFixed(3)},${card.g.toFixed(3)},${card.b.toFixed(3)}) ` +
      `sample=(${sample.r.toFixed(3)},${sample.g.toFixed(3)},${sample.b.toFixed(3)})`,
  );
  return munsellText;
};
