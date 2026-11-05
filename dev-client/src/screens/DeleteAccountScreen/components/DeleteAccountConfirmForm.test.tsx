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

import {fireEvent, render, screen} from '@testing-library/react-native';

import {User} from 'terraso-client-shared/account/accountSlice';

import {
  DeleteAccountConfirmForm,
  DeleteAccountConfirmFormProps,
} from 'terraso-mobile-client/screens/DeleteAccountScreen/components/DeleteAccountConfirmForm';

/* Side-effect import: initializes i18next so queries can use the real English labels. */
import 'terraso-mobile-client/translations';

jest.mock('terraso-mobile-client/navigation/hooks/useNavigation', () => ({
  useNavigation: () => ({pop: jest.fn()}),
}));

const EMAIL = 'me@example.com';

const aUser = {id: 'user-1', email: EMAIL} as User;

const REASON_LABELS = [
  'No longer needed',
  'Switched to a different app',
  'Missing needed features',
  'Difficult to use',
  'Errors or bugs',
  'Privacy or data concerns',
  'Poor support experience',
  'Other',
];

const renderForm = (props: Partial<DeleteAccountConfirmFormProps> = {}) => {
  const onConfirm = jest.fn();
  render(
    <DeleteAccountConfirmForm
      user={aUser}
      isSaving={false}
      isOffline={false}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return {onConfirm};
};

const deleteButton = () => screen.getByRole('button', {name: 'Delete'});
const emailField = () => screen.getByLabelText(/Email address/);
const detailsField = () => screen.getByLabelText('Additional details');
const checkReason = (name: string) =>
  fireEvent.press(screen.getByRole('checkbox', {name}));

describe('DeleteAccountConfirmForm', () => {
  test('renders the reasons question with every option, and the details field', () => {
    renderForm();

    expect(
      screen.getByText('Why are you deleting your account?'),
    ).toBeOnTheScreen();
    expect(
      screen.getAllByRole('checkbox').map(box => box.props.accessibilityLabel),
    ).toEqual(REASON_LABELS);
    expect(detailsField()).toBeOnTheScreen();
  });

  /* Asserts disabled state rather than pressing: in Jest, pressing BaseButton's gesture-handler Pressable fires onPress even when disabled. */
  test('Delete stays disabled until the email matches, even with feedback filled in', () => {
    renderForm();

    checkReason('Errors or bugs');
    fireEvent.changeText(detailsField(), 'It crashed');
    expect(deleteButton()).toBeDisabled();

    fireEvent.changeText(emailField(), 'someone-else@example.com');
    expect(deleteButton()).toBeDisabled();
  });

  test('Delete is enabled by a matching email alone, sending empty feedback', () => {
    const {onConfirm} = renderForm();

    fireEvent.changeText(emailField(), EMAIL);
    expect(deleteButton()).toBeEnabled();

    fireEvent.press(deleteButton());
    expect(onConfirm).toHaveBeenCalledWith({reasons: [], details: ''});
  });

  test('sends the checked reasons in display order and the trimmed details', () => {
    const {onConfirm} = renderForm();

    checkReason('Other');
    checkReason('Difficult to use');
    fireEvent.changeText(detailsField(), '  Too many steps  ');
    fireEvent.changeText(emailField(), EMAIL);
    fireEvent.press(deleteButton());

    expect(onConfirm).toHaveBeenCalledWith({
      reasons: ['difficult_to_use', 'other'],
      details: 'Too many steps',
    });
  });

  test('unchecking a reason leaves it out of the feedback', () => {
    const {onConfirm} = renderForm();

    checkReason('Errors or bugs');
    checkReason('Errors or bugs');
    fireEvent.changeText(emailField(), EMAIL);
    fireEvent.press(deleteButton());

    expect(onConfirm).toHaveBeenCalledWith({reasons: [], details: ''});
  });

  test.each([
    ['offline', {isOffline: true}],
    ['saving', {isSaving: true}],
  ])('Delete is disabled while %s, even with a matching email', (_, props) => {
    renderForm(props);

    fireEvent.changeText(emailField(), EMAIL);

    expect(deleteButton()).toBeDisabled();
  });
});
