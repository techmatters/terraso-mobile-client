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
import {
  Alert,
  Image,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';

import {DngDecoderHybrid} from 'dng-decoder';

import {trackSoilObservation} from 'terraso-mobile-client/analytics/soilObservationTracking';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {
  Box,
  Column,
  Paragraph,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollView} from 'terraso-mobile-client/components/safeview/SafeScrollView';
import {munsellToString} from 'terraso-mobile-client/model/color/colorConversions';
import {getColorFromLinearRgb} from 'terraso-mobile-client/model/color/getColorFromLinearRgb';
import {updateDepthDependentSoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {useDispatch} from 'terraso-mobile-client/store';

export type RawColorAnalysisProps = {
  /** file:// URI to the captured DNG. */
  dngPath: string;
  /**
   * Full sensor dimensions from the vision-camera Photo object. Used to
   * scale ROI coordinates picked in display space up to sensor space
   * before calling decodeDngRois.
   */
  sensorWidth: number;
  sensorHeight: number;
  pitProps: SoilPitInputScreenProps;
};

// Dev-only ROI-picker screen for the experimental RAW capture path.
// User places two rectangles — one over the reference card, one over the
// soil sample — on a preview of the DNG. On confirm the rectangles are
// converted to sensor coordinates, decoded via DngDecoderHybrid, run
// through getColorFromLinearRgb, and the resulting Munsell match is
// dispatched to the same slot the JPEG-path ColorAnalysisScreen writes.
//
// Coordinate systems:
//   sensor     — full-resolution DNG (sensorWidth × sensorHeight)
//   preview    — PNG rendered from the DNG at renderPreview's scaled size
//   display    — pixels on-screen where <Image> is laid out
//
// User drags in display coords; state stored in display coords; converted
// straight to sensor coords at analyze time via the sensor↔display scale.
export const RawColorAnalysisScreen = ({
  dngPath,
  sensorWidth,
  sensorHeight,
  pitProps,
}: RawColorAnalysisProps) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const [preview, setPreview] = useState<{
    uri: string;
    width: number;
    height: number;
  } | null>(null);
  const [displaySize, setDisplaySize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [refRoi, setRefRoi] = useState<DisplayRoi | null>(null);
  const [sampleRoi, setSampleRoi] = useState<DisplayRoi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await DngDecoderHybrid.renderPreview(dngPath, 1200);
        setPreview(p);
      } catch (err) {
        console.error('renderPreview failed:', err);
        setError(String(err));
      }
    })();
  }, [dngPath]);

  const onImageLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!preview) return;
      const w = e.nativeEvent.layout.width;
      const h = w * (preview.height / preview.width);
      setDisplaySize({width: w, height: h});
      // Default ROIs: reference in upper strip, sample in lower strip.
      const boxW = w * 0.5;
      const boxH = h * 0.2;
      const centeredX = (w - boxW) / 2;
      setRefRoi({x: centeredX, y: h * 0.12, w: boxW, h: boxH});
      setSampleRoi({x: centeredX, y: h * 0.65, w: boxW, h: boxH});
    },
    [preview],
  );

  const onAnalyze = useCallback(async () => {
    if (!refRoi || !sampleRoi || !displaySize) return;
    setAnalyzing(true);
    try {
      const munsell = await runAnalysis({
        dngPath,
        sensorWidth,
        sensorHeight,
        displaySize,
        refRoi,
        sampleRoi,
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
  }, [
    dngPath,
    sensorWidth,
    sensorHeight,
    displaySize,
    refRoi,
    sampleRoi,
    pitProps,
    dispatch,
    navigation,
  ]);

  if (error) {
    return (
      <ScreenScaffold AppBar={<AppBar title="RAW analysis (experimental)" />}>
        <SafeScrollView>
          <Column padding="md" space="md">
            <Text variant="body1" bold>
              Could not load preview
            </Text>
            <Paragraph>{error}</Paragraph>
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
            Drag the RED box over the reference card, and the BLUE box over the
            soil sample. Then tap Analyze.
          </Paragraph>
          <Box
            width="100%"
            aspectRatio={preview ? preview.width / preview.height : 3 / 4}
            backgroundColor="grey.900"
            overflow="hidden"
            onLayout={onImageLayout}>
            {preview && (
              <Image
                source={{uri: preview.uri}}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            )}
            {preview && displaySize && refRoi && (
              <RoiBox
                color="#e53935"
                label="REF"
                bounds={displaySize}
                roi={refRoi}
                onChange={setRefRoi}
              />
            )}
            {preview && displaySize && sampleRoi && (
              <RoiBox
                color="#1e88e5"
                label="SOIL"
                bounds={displaySize}
                roi={sampleRoi}
                onChange={setSampleRoi}
              />
            )}
          </Box>
          <ContainedButton
            label={analyzing ? 'Analyzing…' : 'Analyze'}
            onPress={onAnalyze}
            disabled={!preview || !displaySize || analyzing}
          />
        </Column>
      </SafeScrollView>
    </ScreenScaffold>
  );
};

// Draggable rectangle overlay. Position is a controlled prop; parent
// keeps the state. Reports the new position via `onChange` on each
// drag frame — cheap enough at ~60fps for a screen with nothing else
// heavy going on.
const RoiBox = ({
  color,
  label,
  bounds,
  roi,
  onChange,
}: {
  color: string;
  label: string;
  bounds: {width: number; height: number};
  roi: DisplayRoi;
  onChange: (roi: DisplayRoi) => void;
}) => {
  // Track the drag start position in a ref so onPanResponderMove can
  // compute the target correctly (React state updates during the pan
  // are batched by React Native and can lag one frame).
  const startRef = useRef<{x: number; y: number}>({x: roi.x, y: roi.y});

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startRef.current = {x: roi.x, y: roi.y};
        },
        onPanResponderMove: (_, g) => {
          const nx = clamp(startRef.current.x + g.dx, 0, bounds.width - roi.w);
          const ny = clamp(startRef.current.y + g.dy, 0, bounds.height - roi.h);
          onChange({x: nx, y: ny, w: roi.w, h: roi.h});
        },
      }),
    [bounds.width, bounds.height, roi.x, roi.y, roi.w, roi.h, onChange],
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.roi,
        {
          left: roi.x,
          top: roi.y,
          width: roi.w,
          height: roi.h,
          borderColor: color,
        },
      ]}>
      <View style={[styles.roiLabel, {backgroundColor: color}]}>
        <Text color="white" bold>
          {label}
        </Text>
      </View>
    </View>
  );
};

type DisplayRoi = {x: number; y: number; w: number; h: number};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

// Decode both ROIs, run the RAW color pipeline, and dispatch the
// resulting Munsell match to the same slot the JPEG-path
// ColorAnalysisHomeScreen writes. Returns a display-ready Munsell
// string for the confirmation Alert.
const runAnalysis = async ({
  dngPath,
  sensorWidth,
  sensorHeight,
  displaySize,
  refRoi,
  sampleRoi,
  pitProps,
  dispatch,
}: {
  dngPath: string;
  sensorWidth: number;
  sensorHeight: number;
  displaySize: {width: number; height: number};
  refRoi: DisplayRoi;
  sampleRoi: DisplayRoi;
  pitProps: SoilPitInputScreenProps;
  dispatch: ReturnType<typeof useDispatch>;
}): Promise<string> => {
  const scaleX = sensorWidth / displaySize.width;
  const scaleY = sensorHeight / displaySize.height;
  const toSensor = (r: DisplayRoi) => ({
    x: Math.round(r.x * scaleX),
    y: Math.round(r.y * scaleY),
    w: Math.round(r.w * scaleX),
    h: Math.round(r.h * scaleY),
  });
  const [card, sample] = await DngDecoderHybrid.decodeDngRois(dngPath, [
    toSensor(refRoi),
    toSensor(sampleRoi),
  ]);
  const colorResult = getColorFromLinearRgb(card, sample, 'POST_IT_YELLOW');
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
    `RAW analysis dispatched: ${munsellText} ` +
      `card=(${card.r.toFixed(3)},${card.g.toFixed(3)},${card.b.toFixed(3)}) ` +
      `sample=(${sample.r.toFixed(3)},${sample.g.toFixed(3)},${sample.b.toFixed(3)})`,
  );
  return munsellText;
};

const styles = StyleSheet.create({
  roi: {
    position: 'absolute',
    borderWidth: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  roiLabel: {
    position: 'absolute',
    top: -2,
    left: -2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
