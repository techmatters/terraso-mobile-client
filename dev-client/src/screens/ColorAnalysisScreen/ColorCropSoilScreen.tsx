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

import {
  ColorCropScreen,
  CropResult,
} from 'terraso-mobile-client/screens/ColorAnalysisScreen/components/ColorCropScreen';
import {useColorAnalysisContext} from 'terraso-mobile-client/screens/ColorAnalysisScreen/context/colorAnalysisContext';
import {useColorAnalysisNavigation} from 'terraso-mobile-client/screens/ColorAnalysisScreen/navigation/navigation';

export const ColorCropSoilScreen = () => {
  const {t} = useTranslation();
  const {
    photo,
    state: {reference, soil},
    setState,
  } = useColorAnalysisContext();
  const colorAnalysisNavigation = useColorAnalysisNavigation();

  const onCrop = useCallback(
    (crop: CropResult) => {
      setState(state => ({...state, soil: crop}));
      if (reference !== undefined) {
        colorAnalysisNavigation.navigate('COLOR_ANALYSIS_HOME');
      } else {
        colorAnalysisNavigation.navigate('COLOR_CROP_REFERENCE');
      }
    },
    [colorAnalysisNavigation, setState, reference],
  );

  return (
    <ColorCropScreen
      photo={photo}
      initialCrop={soil?.crop}
      onCrop={onCrop}
      title={t('soil.color.soil')}
      description={t('soil.color.crop_soil')}
    />
  );
};
