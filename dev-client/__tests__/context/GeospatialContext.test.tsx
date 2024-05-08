/*
 * Copyright © 2023 Technology Matters
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
import {render} from '@testing-library/react-native';
import {useEffect} from 'react';
import {
  useGeospatialContext,
  GeospatialProviderInjected as GeospatialProvider,
} from 'terraso-mobile-client/context/GeospatialContext';

type Props = {mock: jest.Mock<any, any, any>};

const TestComponent = ({mock}: Props) => {
  const {siteDistances} = useGeospatialContext();
  useEffect(() => {
    mock(
      siteDistances === null
        ? null
        : Object.entries(siteDistances)
            .sort(([, distanceA], [, distanceB]) => distanceA - distanceB)
            .map(([name]) => name),
    );
  }, [siteDistances, mock]);
  return <></>;
};

const USER_LOCATION = {latitude: 0, longitude: 0, elevation: 0};

const EXAMPLE_SITES = [
  {id: 'Abidjan', latitude: 5.316667, longitude: -4.033333, elevation: 123.45},
  {id: 'Accra', latitude: 5.55, longitude: -0.2, elevation: 123.45},
  {id: 'Lomé', latitude: 6.131944, longitude: 1.222778, elevation: 123.45},
  {id: 'Porto Novo', latitude: 6.497222, longitude: 2.605, elevation: 123.45},
  {id: 'Lagos', latitude: 6.455027, longitude: 3.384082, elevation: 123.45},
  {id: 'Douala', latitude: 4.05, longitude: 9.7, elevation: 123.45},
  {
    id: 'Libreville',
    latitude: 0.390278,
    longitude: 9.454167,
    elevation: 123.45,
  },
  {id: 'Luanda', latitude: -8.838333, longitude: 13.234444, elevation: 123.45},
];

const SORTED_EXAMPLE = [
  'Accra',
  'Lomé',
  'Abidjan',
  'Porto Novo',
  'Lagos',
  'Libreville',
  'Douala',
  'Luanda',
];

test('Context works with no sites', () => {
  const mock = jest.fn();
  render(
    <GeospatialProvider sites={[]} userLocation={USER_LOCATION}>
      <TestComponent mock={mock} />
    </GeospatialProvider>,
  );

  expect(mock).toHaveBeenCalledWith([]);
});

test('Context returns nothing if user location not set', () => {
  const mock = jest.fn();
  render(
    <GeospatialProvider sites={EXAMPLE_SITES} userLocation={null}>
      <TestComponent mock={mock} />
    </GeospatialProvider>,
  );
  expect(mock).toHaveBeenCalledWith(null);
});

test('Context returns expected ordering with provided sites', () => {
  const mock = jest.fn();
  render(
    <GeospatialProvider sites={EXAMPLE_SITES} userLocation={USER_LOCATION}>
      <TestComponent mock={mock} />
    </GeospatialProvider>,
  );
  expect(mock).toHaveBeenCalledWith(SORTED_EXAMPLE);
});
