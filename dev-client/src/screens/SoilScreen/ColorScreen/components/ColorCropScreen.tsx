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

import {Fab} from 'native-base';
import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {LayoutChangeEvent} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {
  Box,
  Text,
  Column,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {Photo} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/image';

export type Crop = {top: number; left: number; size: number};
type Dimensions = {width: number; height: number};

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
  onCrop: (_: Crop) => void;
  title: string;
  description: string;
};
export const ColorCropScreen = ({photo, onCrop, title, description}: Props) => {
  const {t} = useTranslation();

  const frameDimension = useSharedValue<number>(minDim(photo));
  const crop = useSharedValue<Crop>({top: 0, left: 0, size: minDim(photo)});
  const start = useSharedValue<Crop>({...crop.value});

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
    (e: LayoutChangeEvent) =>
      (frameDimension.value = e.nativeEvent.layout.width),
    [frameDimension],
  );

  const onComplete = useCallback(() => {
    onCrop({
      size: Math.round(crop.value.size),
      top: Math.round(crop.value.top),
      left: Math.round(crop.value.left),
    });
  }, [onCrop, crop]);

  return (
    <ScreenScaffold AppBar={<AppBar title={title} />}>
      <Column padding="md">
        <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
          <Box
            width="100%"
            aspectRatio={1}
            overflow="hidden"
            onLayout={onLayout}>
            <Animated.Image source={photo} style={[animatedStyles]} />
          </Box>
        </GestureDetector>
        <Box height="md" />
        <Text variant="body1-strong">{title}</Text>
        <Box height="sm" />
        <Text variant="body1">{description}</Text>
      </Column>
      <Fab
        onPress={onComplete}
        label={t('general.next')}
        leftIcon={<Icon name="check" />}
      />
    </ScreenScaffold>
  );
};
