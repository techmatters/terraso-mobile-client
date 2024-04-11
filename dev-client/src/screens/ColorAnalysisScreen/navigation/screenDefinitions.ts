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

import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ParamList} from 'terraso-mobile-client/navigation/types';
import {ColorCropReferenceScreen} from 'terraso-mobile-client/screens/ColorAnalysisScreen/ColorCropReferenceScreen';
import {ColorCropSoilScreen} from 'terraso-mobile-client/screens/ColorAnalysisScreen/ColorCropSoilScreen';
import {generateScreens} from 'terraso-mobile-client/navigation/utils/utils';
import {ScreenDefinitions} from 'terraso-mobile-client/navigation/types';
import {ColorAnalysisHomeScreen} from 'terraso-mobile-client/screens/ColorAnalysisScreen//ColorAnalysisHomeScreen';

const screenDefinitions = {
  COLOR_ANALYSIS_HOME: ColorAnalysisHomeScreen,
  COLOR_CROP_REFERENCE: ColorCropReferenceScreen,
  COLOR_CROP_SOIL: ColorCropSoilScreen,
} as const satisfies ScreenDefinitions;

export type ColorAnalysisParamList = ParamList<typeof screenDefinitions>;

export const Stack = createNativeStackNavigator<ColorAnalysisParamList>();

export const screens = generateScreens(Stack, screenDefinitions);
