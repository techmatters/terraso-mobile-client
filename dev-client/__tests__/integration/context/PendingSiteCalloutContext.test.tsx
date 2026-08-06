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

import {Pressable} from 'react-native';

import {fireEvent} from '@testing-library/react-native';
import {testState} from '@testing/integration/data';
import {render} from '@testing/integration/utils';

import {Site} from 'terraso-client-shared/site/siteTypes';

import {
  useConsumePendingSiteCallout,
  useRequestSiteCallout,
} from 'terraso-mobile-client/context/PendingSiteCalloutContext';

const EXISTING_SITE_ID = '1';

const RequestButton = ({siteId}: {siteId: string}) => {
  const requestSiteCallout = useRequestSiteCallout();
  return (
    <Pressable testID="request" onPress={() => requestSiteCallout(siteId)} />
  );
};

const Consumer = ({showSite}: {showSite: (site: Site) => void}) => {
  useConsumePendingSiteCallout(showSite);
  return null;
};

type HarnessProps = {
  siteId: string;
  showSite: (site: Site) => void;
  /* Changing this remounts the consumer, standing in for the user leaving SitesScreen and coming back later. */
  consumerKey?: string;
};

const Harness = ({siteId, showSite, consumerKey = 'first'}: HarnessProps) => (
  <>
    <RequestButton siteId={siteId} />
    <Consumer key={consumerKey} showSite={showSite} />
  </>
);

describe('PendingSiteCalloutContext', () => {
  let mockedWarn: jest.SpyInstance;

  beforeEach(() => {
    mockedWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    mockedWarn.mockRestore();
  });

  test('hands the requested site to the consumer', () => {
    const showSite = jest.fn();
    const screen = render(
      <Harness siteId={EXISTING_SITE_ID} showSite={showSite} />,
      {initialState: testState},
    );

    expect(showSite).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('request'));

    expect(showSite).toHaveBeenCalledTimes(1);
    expect(showSite).toHaveBeenCalledWith(
      expect.objectContaining({id: EXISTING_SITE_ID}),
    );
  });

  test('drops the request once consumed, so a later consumer does not reopen it', () => {
    const showSite = jest.fn();
    const screen = render(
      <Harness siteId={EXISTING_SITE_ID} showSite={showSite} />,
      {initialState: testState},
    );
    fireEvent.press(screen.getByTestId('request'));
    showSite.mockClear();

    screen.rerender(
      <Harness
        siteId={EXISTING_SITE_ID}
        showSite={showSite}
        consumerKey="second"
      />,
    );

    expect(showSite).not.toHaveBeenCalled();
  });

  test('warns and drops the request when the site is not in the store', () => {
    const showSite = jest.fn();
    const screen = render(
      <Harness siteId="nonexistent-site" showSite={showSite} />,
      {initialState: testState},
    );

    fireEvent.press(screen.getByTestId('request'));

    expect(showSite).not.toHaveBeenCalled();
    expect(mockedWarn).toHaveBeenCalledTimes(1);
  });

  test('a dropped request does not block the next one', () => {
    const showSite = jest.fn();
    const screen = render(
      <Harness siteId="nonexistent-site" showSite={showSite} />,
      {initialState: testState},
    );
    fireEvent.press(screen.getByTestId('request'));

    screen.rerender(<Harness siteId={EXISTING_SITE_ID} showSite={showSite} />);
    fireEvent.press(screen.getByTestId('request'));

    expect(showSite).toHaveBeenCalledTimes(1);
    expect(showSite).toHaveBeenCalledWith(
      expect.objectContaining({id: EXISTING_SITE_ID}),
    );
  });
});
