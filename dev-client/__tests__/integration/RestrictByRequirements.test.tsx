import {Text} from 'react-native';

import {render} from '@testing/integration/utils';

import {RestrictByRequirements} from 'terraso-mobile-client/components/dataRequirements/RestrictByRequirements';

test('renders children and triggers no actions when required data exists', () => {
  let thingsDone = '';
  const requirements = [
    {
      data: {dummyData: 1},
      doIfMissing: () => (thingsDone += 'object1'),
    },
    {
      // This is an object, so it exists despite having only undefined properties
      data: {dummyData: undefined},
      doIfMissing: () => (thingsDone += 'object2'),
    },
  ];

  const {queryByText} = render(
    <RestrictByRequirements requirements={requirements}>
      {() => <Text>Hello world</Text>}
    </RestrictByRequirements>,
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
    <RestrictByRequirements requirements={requirements}>
      {() => <Text>Hello world</Text>}
    </RestrictByRequirements>,
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
    <RestrictByRequirements requirements={requirements}>
      {() => <Text>Hello world</Text>}
    </RestrictByRequirements>,
  );

  expect(queryByText('Hello world')).toBeNull();
  expect(thingsDone).toEqual('null');
});
