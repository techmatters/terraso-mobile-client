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

import {testState} from '@testing/integration/data';
import {render} from '@testing/integration/utils';

import * as permissionHooks from 'terraso-mobile-client/hooks/permissionHooks';
import {EditSiteNoteScreen} from 'terraso-mobile-client/screens/SiteNotesScreen/EditSiteNoteScreen';

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

const mockedUserCanEditSiteNote = jest.spyOn(
  permissionHooks,
  'useUserCanEditSiteNote',
);
mockedUserCanEditSiteNote.mockReturnValue(true);

afterEach(() => {
  mockedPopTo.mockClear();
  mockedUserCanEditSiteNote.mockReset();
});

describe('EditSiteNoteScreen', () => {
  test('renders if data exists', () => {
    const screen = render(<EditSiteNoteScreen noteId="note1" siteId="1" />, {
      route: 'EDIT_SITE_NOTE',
      initialState: testState,
    });

    expect(screen.getByText('Site Note')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('note 1 contents')).toBeOnTheScreen();
    expect(mockedPopTo).toHaveBeenCalledTimes(0);
  });

  test('renders null if site missing', () => {
    const screen = render(
      <EditSiteNoteScreen noteId="note1" siteId="nonexistent-site" />,
      {
        route: 'EDIT_SITE_NOTE',
        initialState: testState,
      },
    );

    // Ideally would want to test that navigation worked, but I can't figure out how to do that
    expect(screen.queryByText('Site Note')).toBeNull();
    expect(screen.queryByText('note 1 contents')).toBeNull();
    expect(mockedPopTo).toHaveBeenCalledTimes(1);
    expect(mockedPopTo).toHaveBeenCalledWith('BOTTOM_TABS');
  });

  test('renders null if note missing', () => {
    const screen = render(
      <EditSiteNoteScreen noteId="nonexistent-note" siteId="1" />,
      {
        route: 'EDIT_SITE_NOTE',
        initialState: testState,
      },
    );

    expect(screen.queryByText('Site Note')).toBeNull();
    expect(screen.queryByText('note 1 contents')).toBeNull();
    expect(mockedPopTo).toHaveBeenCalledTimes(1);
    expect(mockedPopTo).toHaveBeenCalledWith('SITE_TABS', {
      initialTab: 'NOTES',
      siteId: '1',
    });
  });

  test('renders null if user does not have permissions to edit the note', () => {
    mockedUserCanEditSiteNote.mockReturnValue(false);

    const screen = render(
      <EditSiteNoteScreen noteId="nonexistent-note" siteId="1" />,
      {
        route: 'EDIT_SITE_NOTE',
        initialState: testState,
      },
    );

    expect(screen.queryByText('Site Note')).toBeNull();
    expect(screen.queryByText('note 1 contents')).toBeNull();
    expect(mockedPopTo).toHaveBeenCalledTimes(1);
    expect(mockedPopTo).toHaveBeenCalledWith('SITE_TABS', {
      initialTab: 'NOTES',
      siteId: '1',
    });
  });
});
