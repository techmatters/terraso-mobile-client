import {fireEvent} from '@testing-library/react-native';
import {render} from '@testing/integration/utils';

import {AppContent} from 'terraso-mobile-client/app/AppContent';

describe('app launch flows', () => {
  test('welcome screen displays on initial app launch', async () => {
    const app = render(<AppContent />);

    expect(app.getByTestId('welcome-screen')).toBeOnTheScreen();
  });

  test('login screen displays after welcome screen', async () => {
    const app = render(<AppContent />);

    fireEvent.press(app.getByRole('button', {name: 'Get started'}));

    expect(app.getByTestId('login-screen')).toBeOnTheScreen();
  });
});
