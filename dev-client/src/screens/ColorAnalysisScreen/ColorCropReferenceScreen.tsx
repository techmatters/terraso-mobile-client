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
import {useColorAnalysisContext} from 'terraso-mobile-client/screens/ColorAnalysisScreen/context/colorAnalysisContext';
import {useColorAnalysisNavigation} from 'terraso-mobile-client/screens/ColorAnalysisScreen/navigation/navigation';
import {
  ColorCropScreen,
  CropResult,
} from 'terraso-mobile-client/screens/ColorAnalysisScreen/components/ColorCropScreen';

export const ColorCropReferenceScreen = () => {
  const {t} = useTranslation();
  const {
    photo,
    state: {reference, soil},
    setState,
  } = useColorAnalysisContext();
  const colorAnalysisNavigation = useColorAnalysisNavigation();

  const onCrop = useCallback(
    (crop: CropResult) => {
      setState(state => ({...state, reference: crop}));
      if (soil !== undefined) {
        colorAnalysisNavigation.navigate('COLOR_ANALYSIS_HOME');
      } else {
        colorAnalysisNavigation.navigate('COLOR_CROP_SOIL');
      }
    },
    [colorAnalysisNavigation, setState, soil],
  );

  return (
    <ColorCropScreen
      photo={photo}
      initialCrop={reference?.crop}
      onCrop={onCrop}
      title={t('soil.color.reference')}
      description={t('soil.color.crop_reference')}
    />
  );
};
