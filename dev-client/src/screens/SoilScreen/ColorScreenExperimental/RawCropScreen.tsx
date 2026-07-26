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

import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {LayoutChangeEvent} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import {Fab} from 'terraso-mobile-client/components/buttons/Fab';
import {
  Box,
  Column,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollViewWithFab} from 'terraso-mobile-client/components/safeview/SafeScrollViewWithFab';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {
  RawAnalysisRole,
  useRawAnalysisSession,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/rawAnalysisSession';

// The same pan/pinch square-crop UX as ColorCropScreen (the JPEG-path
// production crop) — but with a preview PNG URI + preview dimensions
// instead of a Photo, and without the expo-image-manipulator JPEG
// cropping at the end. All we need out of this screen is the crop
// rectangle; the actual color decode happens back on
// RawColorAnalysisScreen against the DNG, using scaled ROI coords.

type Crop = {top: number; left: number; size: number};

type Dimensions = {width: number; height: number};

const minDim = (d: Dimensions) => {
  'worklet';
  return Math.min(d.width, d.height);
};

const clampCrop = (crop: Crop, d: Dimensions): Crop => {
  'worklet';
  const size = clamp(crop.size, minDim(d) / 100, minDim(d));
  return {
    size,
    top: clamp(crop.top, 0, d.height - size),
    left: clamp(crop.left, 0, d.width - size),
  };
};

export type RawCropProps = {
  role: RawAnalysisRole;
};

export const RawCropScreen = ({role}: RawCropProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const session = useRawAnalysisSession();

  const preview = session.preview;
  const previewDims: Dimensions = preview
    ? {width: preview.width, height: preview.height}
    : {width: 100, height: 100};

  const frameDimension = useSharedValue<number>(minDim(previewDims));
  const initialCrop: Crop = session.getCrop(role) ?? {
    top: 0,
    left: 0,
    size: minDim(previewDims),
  };
  const crop = useSharedValue<Crop>(initialCrop);
  const start = useSharedValue<Crop>(initialCrop);

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
        previewDims,
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
        previewDims,
      );
    })
    .onEnd(() => {
      start.value = {...crop.value};
    });

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [
      {translateX: -(previewDims.width / 2)},
      {translateY: -(previewDims.height / 2)},
      {scale: frameDimension.value / crop.value.size},
      {translateX: -crop.value.left + previewDims.width / 2},
      {translateY: -crop.value.top + previewDims.height / 2},
    ],
  }));

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      'worklet';
      frameDimension.value = e.nativeEvent.layout.width;
    },
    [frameDimension],
  );

  const onComplete = useCallback(() => {
    session.setCrop(role, crop.value);
    navigation.pop();
  }, [session, role, crop, navigation]);

  const title = role === 'reference' ? 'Reference card' : 'Soil sample';
  const description =
    role === 'reference'
      ? 'Frame the reference card inside the square. Pan to move, pinch to zoom.'
      : 'Frame the soil sample inside the square. Pan to move, pinch to zoom.';

  if (!preview) {
    return (
      <ScreenScaffold AppBar={<AppBar title={title} />}>
        <SafeScrollViewWithFab>
          <Column padding="md">
            <Text variant="body1">
              No preview available. Go back and retry.
            </Text>
          </Column>
        </SafeScrollViewWithFab>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold AppBar={<AppBar title={title} />}>
      <SafeScrollViewWithFab>
        <Column padding="md">
          <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
            <Box
              width="100%"
              aspectRatio={1}
              overflow="hidden"
              onLayout={onLayout}>
              <Animated.Image
                source={{uri: preview.uri}}
                style={[
                  {width: preview.width, height: preview.height},
                  animatedStyles,
                ]}
              />
            </Box>
          </GestureDetector>
          <Box height="md" />
          <Text variant="body1-strong">{title}</Text>
          <Box height="sm" />
          <Text variant="body1">{description}</Text>
        </Column>
      </SafeScrollViewWithFab>
      <Fab onPress={onComplete} label={t('general.next')} leftIcon="check" />
    </ScreenScaffold>
  );
};
