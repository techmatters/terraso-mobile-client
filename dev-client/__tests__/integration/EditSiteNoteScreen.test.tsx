import {testState} from '@testing/integration/data';
import {render} from '@testing/integration/utils';

import {EditSiteNoteScreen} from 'terraso-mobile-client/screens/SiteNotesScreen/EditSiteNoteScreen';

const mockedNavigate = jest.fn();
jest.mock('terraso-mobile-client/navigation/hooks/useNavigation', () => {
  const actualNav = jest.requireActual(
    'terraso-mobile-client/navigation/hooks/useNavigation',
  );
  return {
    ...actualNav,
    useNavigation: () => ({navigate: mockedNavigate}),
  };
});

afterEach(() => {
  mockedNavigate.mockClear();
});

test('renders if data exists', () => {
  const screen = render(<EditSiteNoteScreen noteId="note1" siteId="1" />, {
    route: 'EDIT_SITE_NOTE',
    initialState: testState,
  });

  expect(screen.getByText('Site Note')).toBeOnTheScreen();
  expect(screen.getByDisplayValue('note 1 contents')).toBeOnTheScreen();
  expect(mockedNavigate).toHaveBeenCalledTimes(0);
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
  expect(mockedNavigate).toHaveBeenCalledTimes(1);
  expect(mockedNavigate).toHaveBeenCalledWith('BOTTOM_TABS');
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
  expect(mockedNavigate).toHaveBeenCalledTimes(1);
  expect(mockedNavigate).toHaveBeenCalledWith('SITE_TABS', {
    initialTab: 'NOTES',
    siteId: '1',
  });
});
