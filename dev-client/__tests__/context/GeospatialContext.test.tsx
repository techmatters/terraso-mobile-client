import {render} from '@testing-library/react-native';
import {useContext, useEffect} from 'react';
import {
  GeospatialContext,
  GeospatialProvider,
} from 'terraso-mobile-client/context/GeospatialContext';

type Props = {mock: jest.Mock<any, any, any>};

const TestComponent = ({mock}: Props) => {
  const {sortedSites} = useContext(GeospatialContext);
  useEffect(() => {
    mock(sortedSites);
  }, [sortedSites]);
  return <></>;
};

const USER_LOCATION = {latitude: 0, longitude: 0};

const EXAMPLE_SITES = [
  {id: 'Abidjan', latitude: 5.316667, longitude: -4.033333},
  {id: 'Accra', latitude: 5.55, longitude: -0.2},
  {id: 'Lomé', latitude: 6.131944, longitude: 1.222778},
  {id: 'Porto Novo', latitude: 6.497222, longitude: 2.605},
  {id: 'Lagos', latitude: 6.455027, longitude: 3.384082},
  {id: 'Douala', latitude: 4.05, longitude: 9.7},
  {id: 'Libreville', latitude: 0.390278, longitude: 9.454167},
  {id: 'Luanda', latitude: -8.838333, longitude: 13.234444},
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
