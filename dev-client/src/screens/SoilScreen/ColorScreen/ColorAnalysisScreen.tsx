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

import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {Image, ImageStyle, Pressable, StyleSheet} from 'react-native';
import {Icon, IconButton} from 'terraso-mobile-client/components/Icons';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useDispatch} from 'terraso-mobile-client/store';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {PhotoConditions} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/PhotoConditions';
import {Fab} from 'native-base';
import {updateDepthDependentSoilData} from 'terraso-client-shared/soilId/soilIdSlice';
import {
  Photo,
  decodeBase64Jpg,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/image';
import {Crop} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/ColorCropScreen';
import {
  REFERENCES,
  RGBA,
  getColor,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/munsellConversions';

export type ColorAnalysisProps = {
  photo: Photo;
  pitProps?: SoilPitInputScreenProps;
  reference?: Crop;
  soil?: Crop;
};

const analyzeImage = ({
  photo,
  reference,
  soil,
}: {
  photo: Photo;
  reference: Crop;
  soil: Crop;
}) => {
  const {width, data} = decodeBase64Jpg(photo.base64);
  const getPixel = (x: number, y: number): RGBA => {
    const offset = (y * width + x) * 4;
    return [...data.slice(offset, offset + 4)] as RGBA;
  };
  const referencePixels: RGBA[] = [];
  for (var x = 0; x < reference.size; x++) {
    for (var y = 0; y < reference.size; y++) {
      referencePixels.push(getPixel(x + reference.left, y + reference.top));
    }
  }
  const soilPixels: RGBA[] = [];
  for (var x = 0; x < soil.size; x++) {
    for (var y = 0; y < soil.size; y++) {
      soilPixels.push(getPixel(x + soil.left, y + soil.top));
    }
  }

  return getColor(referencePixels, soilPixels, REFERENCES.CANARY_POST_IT)
    ?.munsell;
};

export const ColorAnalysisScreen = (props: ColorAnalysisProps) => {
  const {pitProps, reference, soil, photo} = props;
  const navigation = useNavigation();
  const {t} = useTranslation();
  const dispatch = useDispatch();

  const onAnalyze = useMemo(
    () =>
      pitProps && reference && soil
        ? () => {
            const analysisResult = analyzeImage({photo, reference, soil});
            if (analysisResult !== undefined) {
              console.log(analysisResult);
              dispatch(
                updateDepthDependentSoilData({
                  siteId: pitProps.siteId,
                  depthInterval: pitProps.depthInterval.depthInterval,
                  ...analysisResult,
                }),
              );
              navigation.pop();
            }
          }
        : null,
    [photo, reference, soil, pitProps, dispatch, navigation],
  );

  const onReference = useCallback(() => {
    navigation.navigate('COLOR_CROP_REFERENCE', props);
  }, [navigation, props]);

  const onSoil = useCallback(() => {
    navigation.navigate('COLOR_CROP_SOIL', props);
  }, [navigation, props]);

  const [soilStyle, referenceStyle] = useMemo(
    () =>
      [soil, reference].map(crop =>
        crop
          ? ({
              transform: [
                {translateX: -(photo.width / 2)},
                {translateY: -(photo.height / 2)},
                {scale: 100 / crop.size},
                {translateX: -crop.left + photo.width / 2},
                {translateY: -crop.top + photo.height / 2},
              ],
            } satisfies ImageStyle)
          : undefined,
      ),
    [soil, reference, photo.height, photo.width],
  );

  return (
    <ScreenScaffold>
      <Column padding="xl">
        <Box
          backgroundColor="#D9D9D9"
          borderWidth="2px"
          width="100%"
          height="180px">
          <Image source={photo} resizeMode="contain" style={styles.image} />
          <IconButton
            position="absolute"
            name="delete"
            top="-18px"
            right="-18px"
            size="md"
            borderRadius="full"
            backgroundColor="grey.300"
            _icon={{color: 'action.active'}}
            onPress={() => navigation.pop()}
          />
        </Box>
        <Box height="lg" />
        <Row justifyContent="space-between">
          {(
            [
              ['reference', onReference, referenceStyle],
              ['soil', onSoil, soilStyle],
            ] as const
          ).map(([key, onPress, style]) => (
            <Column key={key} alignItems="flex-start">
              <Text variant="body1-strong">{t(`soil.color.${key}`)}</Text>
              <Box height="sm" />
              <Pressable onPress={onPress}>
                <Box
                  width="100px"
                  height="100px"
                  backgroundColor="grey.300"
                  overflow="hidden">
                  {style ? (
                    <Image source={photo} style={[style]} />
                  ) : (
                    <Box
                      width="100%"
                      height="100%"
                      justifyContent="center"
                      alignItems="center">
                      <Icon name="touch-app" color="action.active" />
                    </Box>
                  )}
                </Box>
              </Pressable>
            </Column>
          ))}
        </Row>
      </Column>
      {pitProps && <PhotoConditions {...pitProps} />}
      <Fab
        label={t('soil.color.analyze')}
        isDisabled={onAnalyze === null}
        onPress={onAnalyze}
        leftIcon={<Icon name="check" />}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  image: {width: '100%', height: '100%'},
});
