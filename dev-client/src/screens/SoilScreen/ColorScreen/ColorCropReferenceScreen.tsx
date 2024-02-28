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

import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ColorAnalysisProps} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/ColorAnalysisScreen';
import {
  ColorCropScreen,
  Crop,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/ColorCropScreen';

export const ColorCropReferenceScreen = (props: ColorAnalysisProps) => {
  const {photo} = props;
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onCrop = useCallback(
    (crop: Crop) => {
      const newProps = {...props, reference: crop};
      if (props.soil) {
        navigation.navigate('COLOR_ANALYSIS', newProps);
      } else {
        navigation.replace('COLOR_CROP_SOIL', newProps);
      }
    },
    [navigation, props],
  );

  return (
    <ColorCropScreen
      photo={photo}
      onCrop={onCrop}
      title={t('soil.color.reference')}
      description={t('soil.color.crop_reference')}
    />
  );
};
