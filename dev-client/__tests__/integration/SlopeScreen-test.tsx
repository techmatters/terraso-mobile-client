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

import {testState} from '@testing/data';
import {render} from '@testing/utils';

import {methodRequired} from 'terraso-client-shared/soilId/soilIdSlice';
import {collectionMethods} from 'terraso-client-shared/soilId/soilIdTypes';
import {fromEntries} from 'terraso-client-shared/utils';

import {SlopeScreen} from 'terraso-mobile-client/screens/SlopeScreen/SlopeScreen';

test('renders correctly', () => {
  const screen = render(<SlopeScreen siteId="1" />, {
    route: 'LOCATION_DASHBOARD',
    initialState: {
      ...testState,
      soilId: {
        status: 'ready',
        soilData: {
          '1': {
            depthIntervalPreset: 'LANDPKS',
            depthIntervals: [],
            depthDependentData: [],
            slopeSteepnessSelect: 'FLAT',
          },
        },
        projectSettings: {
          '1': {
            ...fromEntries(
              collectionMethods.map(method => [methodRequired(method), false]),
            ),
            soilPitRequired: false,
            depthIntervalPreset: 'LANDPKS',
            depthIntervals: [],
            slopeRequired: true,
          },
        },
      },
    },
  }).toJSON();

  expect(screen).toMatchSnapshot();
});
