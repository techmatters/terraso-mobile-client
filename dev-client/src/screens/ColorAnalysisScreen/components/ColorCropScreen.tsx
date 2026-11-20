/*
 * Copyright © 2024 Technology Matters
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
import {useTranslation} from 'react-i18next';
import {LayoutChangeEvent} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import {
  ActionCrop,
  ActionResize,
  manipulateAsync,
  SaveFormat,
} from 'expo-image-manipulator';

import {Fab} from 'terraso-mobile-client/components/buttons/Fab';
import {
  decodeBase64Jpg,
  Photo,
  PhotoWithBase64,
} from 'terraso-mobile-client/components/inputs/image/ImagePicker';
import {
  Box,
  Column,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollViewWithFab} from 'terraso-mobile-client/components/safeview/SafeScrollViewWithFab';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

type Crop = {top: number; left: number; size: number};

export type CropResult = {
  photo: PhotoWithBase64;
  crop: Crop;
  /**
   * Fractional rect (0..1) of the crop within the SOURCE photo, used by
   * ColorAnalysisHomeScreen to overlay a labelled rectangle on the full
   * photo preview. Independent of pixel dims so a downscaled preview
   * renders it at the right place. Populated by both crop producers —
   * the manual ColorCropScreen (converted from pixel crop) and the new
   * preview camera's auto-crop (the original DISPLAY_*_ROI). Optional for
   * backward compat with any pre-existing CropResults in persisted state.
   */
  displayRoi?: {x: number; y: number; w: number; h: number};
};

type Dimensions = {width: number; height: number};

// Live ROI-quality outline (mirrors the preview camera's green/red boxes): the
// luma variance of the current crop region, thresholded. Below = uniform enough
// (green); above = too much contrast / shadow in the region (red).
const QUALITY_VARIANCE_THRESHOLD = 500;
// Longest edge of the downscaled copy the variance is sampled from, and the
// min interval between evaluations while dragging.
const QUALITY_SAMPLE_DIM = 160;
const QUALITY_EVAL_INTERVAL_MS = 80;

type Sample = {data: Uint8Array; width: number; height: number};

// Luma variance of the crop region within the downscaled sample.
const regionVariance = (sample: Sample, crop: Crop, sourceWidth: number) => {
  const scale = sample.width / sourceWidth;
  const x0 = Math.max(0, Math.floor(crop.left * scale));
  const y0 = Math.max(0, Math.floor(crop.top * scale));
  const x1 = Math.min(sample.width, Math.ceil((crop.left + crop.size) * scale));
  const y1 = Math.min(sample.height, Math.ceil((crop.top + crop.size) * scale));
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * sample.width + x) * 4;
      const luma =
        0.299 * sample.data[o] +
        0.587 * sample.data[o + 1] +
        0.114 * sample.data[o + 2];
      sum += luma;
      sumSq += luma * luma;
      n += 1;
    }
  }
  if (n === 0) {
    return null;
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
};

const minDim = (dimensions: Dimensions) => {
  'worklet';
  return Math.min(dimensions.width, dimensions.height);
};

const clampCrop = (crop: Crop, dimensions: Dimensions): Crop => {
  'worklet';
  const size = clamp(crop.size, minDim(dimensions) / 100, minDim(dimensions));
  return {
    size,
    top: clamp(crop.top, 0, dimensions.height - size),
    left: clamp(crop.left, 0, dimensions.width - size),
  };
};

type Props = {
  photo: Photo;
  initialCrop?: Crop;
  onCrop: (_: CropResult) => void;
  title: string;
  description: string;
  // Defaults to "Next"; callers that know this is the final region pass "Save".
  fabLabel?: string;
};
export const ColorCropScreen = ({
  photo,
  initialCrop,
  onCrop,
  title,
  description,
  fabLabel,
}: Props) => {
  const {t} = useTranslation();

  const frameDimension = useSharedValue<number>(minDim(photo));
  const initialCropValue = initialCrop ?? {
    top: 0,
    left: 0,
    size: minDim(photo),
  };
  const crop = useSharedValue<Crop>(initialCropValue);
  const start = useSharedValue<Crop>(initialCropValue);

  // Live ROI-quality outline. A downscaled copy of the photo is decoded once;
  // the crop region's luma variance is re-evaluated (throttled) as the user
  // drags, colouring the frame green/red.
  const [quality, setQuality] = useState<'ok' | 'bad' | undefined>(undefined);
  const sampleRef = useRef<Sample | null>(null);
  const lastEvalRef = useRef(0);
  const evaluateQuality = useCallback(
    (c: Crop) => {
      const now = Date.now();
      if (now - lastEvalRef.current < QUALITY_EVAL_INTERVAL_MS) {
        return;
      }
      lastEvalRef.current = now;
      const sample = sampleRef.current;
      if (!sample) {
        return;
      }
      const variance = regionVariance(sample, c, photo.width);
      setQuality(
        variance == null
          ? undefined
          : variance < QUALITY_VARIANCE_THRESHOLD
            ? 'ok'
            : 'bad',
      );
    },
    [photo.width],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const small = await manipulateAsync(
          photo.uri,
          [{resize: {width: QUALITY_SAMPLE_DIM}} as ActionResize],
          {base64: true, format: SaveFormat.JPEG},
        );
        if (!small.base64 || cancelled) {
          return;
        }
        const decoded = decodeBase64Jpg(small.base64);
        sampleRef.current = {
          data: decoded.data,
          width: decoded.width,
          height: decoded.height,
        };
        lastEvalRef.current = 0;
        evaluateQuality(crop.value);
      } catch (err) {
        console.warn('[colorCrop] quality sample failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photo.uri, evaluateQuality, crop]);

  useAnimatedReaction(
    () => crop.value,
    cur => {
      runOnJS(evaluateQuality)(cur);
    },
  );

  const pan = Gesture.Pan()
    .maxPointers(1)
    .onUpdate(e => {
      crop.value = clampCrop(
        {
          size: crop.value.size,
          left:
            start.value.left -
            (e.translationX * start.value.size) / frameDimension.value,
          top:
            start.value.top -
            (e.translationY * start.value.size) / frameDimension.value,
        },
        photo,
      );
    })
    .onEnd(() => {
      start.value = {...crop.value};
    });

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      crop.value = clampCrop(
        {
          top: start.value.top + (start.value.size / 2) * (1 - 1 / e.scale),
          left: start.value.left + (start.value.size / 2) * (1 - 1 / e.scale),
          size: start.value.size / e.scale,
        },
        photo,
      );
    })
    .onEnd(() => {
      start.value = {...crop.value};
    });

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [
      {translateX: -(photo.width / 2)},
      {translateY: -(photo.height / 2)},
      {scale: frameDimension.value / crop.value.size},
      {translateX: -crop.value.left + photo.width / 2},
      {translateY: -crop.value.top + photo.height / 2},
    ],
  }));

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      'worklet';
      frameDimension.value = e.nativeEvent.layout.width;
    },
    [frameDimension],
  );

  const onComplete = useCallback(async () => {
    const cropAction: ActionCrop = {
      crop: {
        originX: crop.value.left,
        originY: crop.value.top,
        height: crop.value.size,
        width: crop.value.size,
      },
    };

    const resizeAction: ActionResize = {
      resize: {
        width: Math.min(crop.value.size, 200),
        height: Math.min(crop.value.size, 200),
      },
    };

    const croppedPhoto = await manipulateAsync(
      photo.uri,
      [cropAction, resizeAction],
      {
        base64: true,
        compress: 1.0,
        format: SaveFormat.JPEG,
      },
    );

    if (!croppedPhoto.base64) {
      throw Error('unexpected error: missing base64 encoding of cropped photo');
    }

    // Convert the pixel-space square crop into a fractional rect so the home
    // screen can overlay it on the full photo preview (independent of the
    // preview's displayed size).
    const displayRoi = {
      x: crop.value.left / photo.width,
      y: crop.value.top / photo.height,
      w: crop.value.size / photo.width,
      h: crop.value.size / photo.height,
    };
    onCrop({
      crop: crop.value,
      photo: {...croppedPhoto, base64: croppedPhoto.base64},
      displayRoi,
    });
  }, [photo.uri, photo.width, photo.height, onCrop, crop]);

  return (
    <ScreenScaffold AppBar={<AppBar title={title} />}>
      <SafeScrollViewWithFab>
        <Column padding="md">
          <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
            <Box
              width="100%"
              aspectRatio={1}
              overflow="hidden"
              borderWidth="3px"
              borderColor={
                quality === 'ok'
                  ? '#22ee22'
                  : quality === 'bad'
                    ? '#ee2222'
                    : 'transparent'
              }
              onLayout={onLayout}>
              <Animated.Image source={photo} style={[animatedStyles]} />
            </Box>
          </GestureDetector>
          <Box height="md" />
          <Text variant="body1-strong">{title}</Text>
          <Box height="sm" />
          <Text variant="body1">{description}</Text>
        </Column>
      </SafeScrollViewWithFab>
      <Fab
        onPress={onComplete}
        label={fabLabel ?? t('general.next')}
        leftIcon="check"
      />
    </ScreenScaffold>
  );
};
