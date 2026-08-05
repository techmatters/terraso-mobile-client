/*
 * Copyright © 2026 Technology Matters
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

import {fireEvent, waitFor} from '@testing-library/react-native';
import {testState} from '@testing/integration/data';
import {render} from '@testing/integration/utils';

import {Site} from 'terraso-client-shared/site/siteTypes';

import {useConsumePendingSiteCallout} from 'terraso-mobile-client/context/PendingSiteCalloutContext';
import {CreateSiteView} from 'terraso-mobile-client/screens/CreateSiteScreen/components/CreateSiteView';
import {AppState} from 'terraso-mobile-client/store';

const mockedPopTo = jest.fn();
jest.mock('terraso-mobile-client/navigation/hooks/useNavigation', () => {
  const actualNav = jest.requireActual(
    'terraso-mobile-client/navigation/hooks/useNavigation',
  );
  return {
    ...actualNav,
    useNavigation: () => ({popTo: mockedPopTo}),
  };
});

/* Matches the site pin so `resolveElevation` short-circuits instead of reaching for the elevation service. */
const SITE_PIN = {latitude: 1, longitude: 1};

const CREATED_SITE: Site = {
  id: 'created-site',
  name: 'Created site',
  latitude: SITE_PIN.latitude,
  longitude: SITE_PIN.longitude,
  elevation: 1,
  privacy: 'PRIVATE',
  archived: false,
  updatedAt: '',
  notes: {},
};

/* `addSite` writes to the store before returning, so the store the consumer reads already holds the new site. */
const stateWithCreatedSite: Partial<AppState> = {
  ...testState,
  site: testState.site && {
    ...testState.site,
    sites: {...testState.site.sites, [CREATED_SITE.id]: CREATED_SITE},
  },
};

const Consumer = ({showSite}: {showSite: (site: Site) => void}) => {
  useConsumePendingSiteCallout(showSite);
  return null;
};

const renderCreateSiteView = (
  createSiteCallback: jest.Mock,
  showSite: jest.Mock,
) =>
  render(
    <>
      <CreateSiteView
        createSiteCallback={createSiteCallback}
        sitePin={SITE_PIN}
        elevation={CREATED_SITE.elevation}
      />
      <Consumer showSite={showSite} />
    </>,
    {route: 'CREATE_SITE', initialState: stateWithCreatedSite},
  );

const submitForm = async (screen: ReturnType<typeof renderCreateSiteView>) => {
  fireEvent.changeText(screen.getByPlaceholderText('Site name'), 'New site');
  await waitFor(() => expect(screen.getByText('Create')).toBeEnabled());
  fireEvent.press(screen.getByText('Create'));
};

afterEach(() => {
  mockedPopTo.mockClear();
});

describe('CreateSiteView', () => {
  test('requests the callout for the created site and returns to the tabs', async () => {
    const createSiteCallback = jest.fn().mockResolvedValue(CREATED_SITE);
    const showSite = jest.fn();
    const screen = renderCreateSiteView(createSiteCallback, showSite);

    await submitForm(screen);

    await waitFor(() => expect(showSite).toHaveBeenCalledTimes(1));
    expect(showSite).toHaveBeenCalledWith(
      expect.objectContaining({id: CREATED_SITE.id}),
    );
    expect(mockedPopTo).toHaveBeenCalledWith('BOTTOM_TABS');
  });

  test('requests nothing when site creation fails', async () => {
    const createSiteCallback = jest.fn().mockResolvedValue(undefined);
    const showSite = jest.fn();
    const screen = renderCreateSiteView(createSiteCallback, showSite);

    await submitForm(screen);

    await waitFor(() => expect(createSiteCallback).toHaveBeenCalledTimes(1));
    expect(showSite).not.toHaveBeenCalled();
    expect(mockedPopTo).not.toHaveBeenCalled();
  });
});
