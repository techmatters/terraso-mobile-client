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

import {Text} from 'react-native';

import {render} from '@testing/integration/utils';

import {ScreenDataRequirements} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';

describe('ScreenDataRequirements', () => {
  test('renders children and triggers no actions when required data exists', () => {
    let thingsDone = '';
    const requirements = [
      {
        data: {dummyData: 1},
        doIfMissing: () => (thingsDone += 'object'),
      },
      {
        // This is an object, so it exists despite having only undefined properties
        data: {dummyData: undefined},
        doIfMissing: () => (thingsDone += 'object with undefined'),
      },
      {
        // Some falsy things are still considered valid
        data: 0,
        doIfMissing: () => (thingsDone += '0'),
      },
      {
        // Some falsy things are still considered valid
        data: '',
        doIfMissing: () => (thingsDone += 'empty string'),
      },
      {
        // Some falsy things are still considered valid
        data: NaN,
        doIfMissing: () => (thingsDone += 'NaN'),
      },
    ];

    const {queryByText} = render(
      <ScreenDataRequirements requirements={requirements}>
        {() => <Text>Hello world</Text>}
      </ScreenDataRequirements>,
    );

    expect(queryByText('Hello world')).toBeTruthy();
    expect(thingsDone).toEqual('');
  });

  test('does not render children and triggers action when earliest missing required data is undefined', () => {
    let thingsDone = '';
    const requirements = [
      {
        data: {dummyData: 1},
        doIfMissing: () => (thingsDone += 'object'),
      },
      {
        data: undefined,
        doIfMissing: () => (thingsDone += 'undefined'),
      },
      {
        data: null,
        doIfMissing: () => (thingsDone += 'null'),
      },
    ];

    const {queryByText} = render(
      <ScreenDataRequirements requirements={requirements}>
        {() => <Text>Hello world</Text>}
      </ScreenDataRequirements>,
    );

    expect(queryByText('Hello world')).toBeNull();
    expect(thingsDone).toEqual('undefined');
  });

  test('does not render children and triggers action when earliest missing required data is null', () => {
    let thingsDone = '';
    const requirements = [
      {
        data: null,
        doIfMissing: () => (thingsDone += 'null'),
      },
      {
        data: undefined,
        doIfMissing: () => (thingsDone += 'undefined'),
      },
      {
        data: {undefined},
        doIfMissing: () => (thingsDone += 'object'),
      },
    ];

    const {queryByText} = render(
      <ScreenDataRequirements requirements={requirements}>
        {() => <Text>Hello world</Text>}
      </ScreenDataRequirements>,
    );

    expect(queryByText('Hello world')).toBeNull();
    expect(thingsDone).toEqual('null');
  });

  test('does not render children and triggers action when required data is falsy', () => {
    let thingsDone = '';
    const requirements = [
      {
        data: false,
        doIfMissing: () => (thingsDone += 'false'),
      },
    ];

    const {queryByText} = render(
      <ScreenDataRequirements requirements={requirements}>
        {() => <Text>Hello world</Text>}
      </ScreenDataRequirements>,
    );

    expect(queryByText('Hello world')).toBeNull();
    expect(thingsDone).toEqual('false');
  });
});
