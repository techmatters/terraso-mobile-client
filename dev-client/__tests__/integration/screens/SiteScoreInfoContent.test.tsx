// SiteScoreInfoContent.test.tsx
import {render} from '@testing/integration/utils';

import {SiteScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SiteScoreInfoContent';

const mockUSSiteDataMatch = {
  dataSource: 'SSURGO',
  distanceToNearestMapUnitM: 10,
  combinedMatch: {
    rank: 4,
    score: 0.4,
  },
  dataMatch: {
    rank: 3,
    score: 0.3,
  },
  locationMatch: {
    rank: 2,
    score: 0.2,
  },
  soilInfo: {
    ecologicalSite: {
      id: 'eco site id',
      name: 'eco site name',
      url: 'http://ecositeurl.com',
    },
    landCapabilityClass: {
      capabilityClass: '7',
      subClass: 'e',
    },
    soilData: {
      depthDependentData: [],
    },
    soilSeries: {
      description: 'Description A',
      fullDescriptionUrl: 'http://descriptionlink.com',
      name: 'Soil A',
      taxonomySubgroup: 'Subgroup A',
    },
  },
};

const mockGlobalSiteLocationMatch = {
  dataSource: 'HWSD',
  distanceToNearestMapUnitM: 10,
  locationMatch: {
    rank: 2,
    score: 0.2,
  },
  soilInfo: {
    soilData: {
      depthDependentData: [],
    },
    soilSeries: {
      // An example soil name (as returned by localhost:8000/graphql)
      // Note that we expect any possible global soil name to correspond to one of the soil match names in the en.json file
      name: 'Haplic acrisols',
    },
  },
};

const whateverCoords = {latitude: 0, longitude: 0};

test('renders expected components when US and has data + location match', () => {
  const screen = render(
    <SiteScoreInfoContent
      siteId="site1"
      coords={whateverCoords}
      dataRegion="US"
      siteMatch={mockUSSiteDataMatch}
    />,
  );

  expect(screen.queryByText('Subgroup A')).toBeOnTheScreen();
  expect(screen.queryByText('Description A')).toBeOnTheScreen();

  expect(screen.queryByText('Soil Series Full Description')).toBeOnTheScreen();
  expect(
    screen.queryByText('Ecological Site Full Description'),
  ).toBeOnTheScreen();

  // This is a partial match because the data source is part of a longer string
  expect(screen.queryAllByText(/SSURGO/)).not.toHaveLength(0);

  // Using queryAll because there are multiple instances due to info text
  expect(screen.queryAllByText('Location Score')).not.toHaveLength(0);
  expect(screen.queryByText('20%')).toBeOnTheScreen();
  expect(screen.queryAllByText('Soil Properties Score')).not.toHaveLength(0);
  expect(screen.queryByText('30%')).toBeOnTheScreen();
});

test('renders expected components when Global and only has location match', () => {
  const screen = render(
    <SiteScoreInfoContent
      siteId="site1"
      coords={whateverCoords}
      dataRegion="GLOBAL"
      siteMatch={mockGlobalSiteLocationMatch}
    />,
  );
  expect(screen.queryByText('Description')).toBeOnTheScreen();
  expect(screen.queryByText(/Haplic Acrisols are/)).toBeOnTheScreen();
  expect(screen.queryByText('Management')).toBeOnTheScreen();
  expect(
    screen.queryByText(/Because the soil tends to be acidic/),
  ).toBeOnTheScreen();

  expect(
    screen.queryByText('Soil Series Full Description'),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByText('Ecological Site Full Description'),
  ).not.toBeOnTheScreen();
  expect(screen.queryAllByText(/FAO HWSD/)).not.toHaveLength(0);

  expect(screen.queryAllByText('Location Score')).not.toHaveLength(0); //toBeOnTheScreen();
  expect(screen.queryByText('20%')).toBeOnTheScreen();
  expect(screen.queryAllByText('Soil Properties Score')).toHaveLength(0);
});
