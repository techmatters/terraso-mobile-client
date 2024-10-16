import {testState} from '@testing/integration/data';
import {render} from '@testing/integration/utils';

import {EditSiteNoteScreen} from 'terraso-mobile-client/screens/SiteNotesScreen/EditSiteNoteScreen';

test('renders if data exists', () => {
  const screen = render(<EditSiteNoteScreen noteId="note1" siteId="1" />, {
    route: 'EDIT_SITE_NOTE',
    initialState: testState,
  });

  expect(screen.getByText('Site Note')).toBeOnTheScreen();
  expect(screen.getByDisplayValue('note 1 contents')).toBeOnTheScreen();
});

test('renders null if site missing', () => {
  const screen = render(
    <EditSiteNoteScreen noteId="note1" siteId="nonexistent-site" />,
    {
      route: 'EDIT_SITE_NOTE',
      initialState: testState,
    },
  );

  expect(screen.queryByText('Site Note')).toBeNull();
  expect(screen.queryByText('note 1 contents')).toBeNull();
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
});
