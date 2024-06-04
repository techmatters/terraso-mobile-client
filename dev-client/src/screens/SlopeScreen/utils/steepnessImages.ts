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

import {ImageSourcePropType} from 'react-native';

import {SoilIdSoilDataSlopeSteepnessSelectChoices} from 'terraso-client-shared/graphqlSchema/graphql';

export const STEEPNESS_IMAGES = {
  FLAT: require('terraso-mobile-client/assets/slope/steepness/flat.png'),
  GENTLE: require('terraso-mobile-client/assets/slope/steepness/gentle.png'),
  MODERATE: require('terraso-mobile-client/assets/slope/steepness/moderate.png'),
  ROLLING: require('terraso-mobile-client/assets/slope/steepness/rolling.png'),
  HILLY: require('terraso-mobile-client/assets/slope/steepness/hilly.png'),
  STEEP: require('terraso-mobile-client/assets/slope/steepness/steep.png'),
  MODERATELY_STEEP: require('terraso-mobile-client/assets/slope/steepness/moderately-steep.png'),
  VERY_STEEP: require('terraso-mobile-client/assets/slope/steepness/very-steep.png'),
  STEEPEST: require('terraso-mobile-client/assets/slope/steepness/steepest.png'),
} satisfies Record<
  SoilIdSoilDataSlopeSteepnessSelectChoices,
  ImageSourcePropType
> as Record<SoilIdSoilDataSlopeSteepnessSelectChoices, ImageSourcePropType>;
