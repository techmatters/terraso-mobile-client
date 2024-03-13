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
import {Image, Pressable, StyleSheet} from 'react-native';
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
  REFERENCES,
  RGBA,
  getColor,
  isValidSoilColor,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/munsellConversions';
import {
  Photo,
  PhotoWithBase64,
  decodeBase64Jpg,
} from 'terraso-mobile-client/components/ImagePicker';

export type ColorAnalysisProps = {
  photo: Photo;
  pitProps?: SoilPitInputScreenProps;
  reference?: PhotoWithBase64;
  soil?: PhotoWithBase64;
};

const analyzeImage = async ({
  reference,
  soil,
}: Record<'soil' | 'reference', PhotoWithBase64>) => {
  const [referencePixels, soilPixels] = [reference, soil].map(({base64}) => {
    const {data, height, width} = decodeBase64Jpg(base64);
    const pixels: RGBA[] = [];
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < height; x++) {
        const offset = (y * width + x) * 4;
        pixels.push([...data.slice(offset, offset + 4)] as RGBA);
      }
    }
    return pixels;
  });

  return getColor(referencePixels, soilPixels, REFERENCES.CANARY_POST_IT)
    .munsell;
};

export const ColorAnalysisScreen = (props: ColorAnalysisProps) => {
  const {pitProps, reference, soil, photo} = props;
  const navigation = useNavigation();
  const {t} = useTranslation();
  const dispatch = useDispatch();

  const onAnalyze = useMemo(() => {
    if (!pitProps || !reference || !soil) {
      return null;
    }

    return async () => {
      const color = await analyzeImage({
        reference,
        soil,
      });

      if (isValidSoilColor(color)) {
        dispatch(
          updateDepthDependentSoilData({
            siteId: pitProps.siteId,
            depthInterval: pitProps.depthInterval.depthInterval,
            ...color,
            colorPhotoUsed: true,
          }),
        );
        navigation.pop();
      } else {
        console.log('invalid color', color);
      }
    };
  }, [reference, soil, pitProps, dispatch, navigation]);

  const onReference = useCallback(() => {
    navigation.navigate('COLOR_CROP_REFERENCE', props);
  }, [navigation, props]);

  const onSoil = useCallback(() => {
    navigation.navigate('COLOR_CROP_SOIL', props);
  }, [navigation, props]);

  return (
    <ScreenScaffold>
      <Column padding="xl">
        <Box
          backgroundColor="#D9D9D9"
          borderWidth="2px"
          width="100%"
          height="180px">
          <Image source={photo} resizeMode="cover" style={styles.image} />
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
              ['reference', onReference, reference],
              ['soil', onSoil, soil],
            ] as const
          ).map(([key, onPress, croppedPhoto]) => (
            <Column key={key} alignItems="flex-start">
              <Text variant="body1-strong">{t(`soil.color.${key}`)}</Text>
              <Box height="sm" />
              <Pressable onPress={onPress}>
                <Box
                  width="100px"
                  height="100px"
                  backgroundColor="grey.300"
                  overflow="hidden">
                  {croppedPhoto ? (
                    <Image source={croppedPhoto} style={styles.image} />
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
