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
import {ImageSourcePropType, Pressable} from 'react-native';
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

export type ColorAnalysisProps = {
  photo: ImageSourcePropType;
  pitProps?: SoilPitInputScreenProps;
  reference?: CropParameters;
  soil?: CropParameters;
};

export type CropParameters = number;

const analyzeImage = ({}: {
  photo: ImageSourcePropType;
  reference: CropParameters;
  soil: CropParameters;
}) =>
  ({
    colorHue: 'YR',
    colorHueSubstep: 'SUBSTEP_2_5',
    colorValue: 'VALUE_6',
    colorChroma: 'CHROMA_4',
  }) as const;

export const ColorAnalysisScreen = (props: ColorAnalysisProps) => {
  const {pitProps, reference, soil, photo} = props;
  const navigation = useNavigation();
  const {t} = useTranslation();
  const dispatch = useDispatch();

  const onAnalyze = useMemo(
    () =>
      pitProps && reference && soil
        ? () => {
            dispatch(
              updateDepthDependentSoilData({
                siteId: pitProps.siteId,
                depthInterval: pitProps.depthInterval.depthInterval,
                ...analyzeImage({photo, reference, soil}),
              }),
            );
            navigation.pop();
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

  return (
    <ScreenScaffold>
      <Column padding="xl">
        <Box
          backgroundColor="#D9D9D9"
          borderWidth="2px"
          width="100%"
          height="180px">
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
              ['reference', onReference],
              ['soil', onSoil],
            ] as const
          ).map(([key, onPress]) => (
            <Column key={key} alignItems="flex-start">
              <Text variant="body1-strong">{t(`soil.color.${key}`)}</Text>
              <Box height="sm" />
              <Pressable onPress={onPress}>
                <Box
                  width="100px"
                  height="100px"
                  backgroundColor="grey.300"
                  alignItems="center"
                  justifyContent="center">
                  <Icon name="touch-app" color="action.active" />
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
