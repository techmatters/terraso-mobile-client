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

import {Button, Heading, ScrollView} from 'native-base';
import {Text} from 'native-base';
import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {Image, ImageSourcePropType} from 'react-native';
import {selectDepthDependentData} from 'terraso-client-shared/selectors';
import {
  updateDepthDependentSoilData,
  RockFragmentVolume,
  SoilTexture,
  textures,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {fromEntries, entries} from 'terraso-client-shared/utils';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {
  ImageRadio,
  radioImage,
} from 'terraso-mobile-client/components/ImageRadio';
import {LastModified} from 'terraso-mobile-client/components/LastModified';
import {FormSelect} from 'terraso-mobile-client/components/form/FormSelect';
import {FormTooltip} from 'terraso-mobile-client/components/form/FormTooltip';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  SoilPitInputScreenProps,
  SoilPitInputScreenScaffold,
} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {
  Box,
  Column,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

const FRAGMENT_IMAGES = {
  VOLUME_0_1: require('terraso-mobile-client/assets/texture/rock-fragment/1.png'),
  VOLUME_1_15: require('terraso-mobile-client/assets/texture/rock-fragment/15.png'),
  VOLUME_15_35: require('terraso-mobile-client/assets/texture/rock-fragment/35.png'),
  VOLUME_35_60: require('terraso-mobile-client/assets/texture/rock-fragment/60.png'),
  VOLUME_60: require('terraso-mobile-client/assets/texture/rock-fragment/90.png'),
} satisfies Record<RockFragmentVolume, ImageSourcePropType> as Record<
  RockFragmentVolume,
  ImageSourcePropType
>;

export const TextureScreen = (props: SoilPitInputScreenProps) => {
  const {siteId, depthInterval} = props;
  const {t} = useTranslation();
  const intervalData = useSelector(selectDepthDependentData(props));
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const onTextureChange = useCallback(
    (texture: SoilTexture) => {
      dispatch(
        updateDepthDependentSoilData({
          siteId,
          depthInterval: depthInterval.depthInterval,
          texture,
        }),
      );
    },
    [dispatch, siteId, depthInterval],
  );

  const textureOptions = useMemo(
    () =>
      fromEntries(
        textures.map(value => [value, t(`soil.texture.class.${value}`)]),
      ),
    [t],
  );

  const onGuide = useCallback(
    () => navigation.navigate('TEXTURE_GUIDE', props),
    [props, navigation],
  );

  // const onClayChange = useCallback(
  //   (clay: string) => {
  //     const parsed = parseInt(clay, 10);
  //     if (parsed >= 0 && parsed <= 100) {
  //       dispatch(
  //         updateDepthDependentSoilData({
  //           siteId,
  //           depthInterval: depthInterval.depthInterval,
  //           // clayPercent: clay,
  //         }),
  //       );
  //     }
  //   },
  //   [dispatch, siteId, depthInterval],
  // );

  const fragmentOptions = useMemo(
    () =>
      fromEntries(
        entries(FRAGMENT_IMAGES).map(([value, image]) => [
          value,
          {
            label: t(`soil.texture.rockFragment.${value}`),
            image: <Image style={radioImage} source={image} />,
          },
        ]),
      ),
    [t],
  );

  const onFragmentChange = useCallback(
    (rockFragmentVolume: RockFragmentVolume | null) => {
      dispatch(
        updateDepthDependentSoilData({
          siteId,
          depthInterval: depthInterval.depthInterval,
          rockFragmentVolume,
        }),
      );
    },
    [dispatch, siteId, depthInterval],
  );

  return (
    <SoilPitInputScreenScaffold {...props}>
      <ScrollView bg="grey.300">
        <Column p="15px" bg="primary.contrast">
          <Row alignItems="center">
            <Heading variant="h6">{t('soil.texture.title')}</Heading>
            {/* TODO */}
            <FormTooltip icon="info">Unimplemented tooltip</FormTooltip>
          </Row>
          <LastModified />
          <FormSelect<SoilTexture>
            placeholder={t('soil.texture.label')}
            options={textureOptions}
            selectedValue={intervalData?.texture ?? undefined}
            onValueChange={onTextureChange}
          />
        </Column>
        <Column p="15px" alignItems="flex-start">
          <Text variant="body1">{t('soil.texture.guide_intro')}</Text>
          <Box height="10px" />
          <Button
            onPress={onGuide}
            rightIcon={<Icon name="chevron-right" />}
            _text={{textTransform: 'uppercase'}}>
            {t('soil.texture.use_guide_label')}
          </Button>
        </Column>
        <Column p="15px" bg="primary.contrast">
          {/*<Row alignItems="center">
            <Text variant="body1-strong">{t('soil.texture.clay_title')}</Text>
            <FormTooltip icon="info">Unimplemented tooltip</FormTooltip>
          </Row>
          <Box height="10px" />
           <FormInput
            onChangeText={onClayChange}
            keyboardType="numeric"
            placeholder={t('soil.texture.clay_label')}
            helpText={t('soil.texture.clay_help')}
          />
          <Box height="20px" /> */}
          <Row alignItems="center">
            <Text variant="body1-strong">
              {t('soil.texture.fragment_title')}
            </Text>
            {/* TODO */}
            <FormTooltip icon="info">Unimplemented tooltip</FormTooltip>
          </Row>
          <Box height="10px" />
          <ImageRadio
            value={intervalData?.rockFragmentVolume}
            options={fragmentOptions}
            minimumPerRow={2}
            onChange={onFragmentChange}
          />
        </Column>
      </ScrollView>
    </SoilPitInputScreenScaffold>
  );
};
