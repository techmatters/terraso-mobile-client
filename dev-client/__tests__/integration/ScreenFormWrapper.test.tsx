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

import {act, fireEvent} from '@testing-library/react-native';
import {testState} from '@testing/integration/data';
import {render} from '@testing/integration/utils';

import {ScreenFormWrapper} from 'terraso-mobile-client/components/ScreenFormWrapper';
import {SITE_NOTE_MIN_LENGTH} from 'terraso-mobile-client/constants';
import {SiteNoteForm} from 'terraso-mobile-client/screens/SiteNotesScreen/components/SiteNoteForm';

jest.mock('terraso-mobile-client/navigation/hooks/useNavigation', () => {
  const actualNav = jest.requireActual(
    'terraso-mobile-client/navigation/hooks/useNavigation',
  );
  return {
    ...actualNav,
    useNavigation: () => ({pop: jest.fn(), popTo: jest.fn()}),
  };
});

const renderForm = (initialContent: string, onSubmit = jest.fn()) => {
  const screen = render(
    <ScreenFormWrapper
      initialValues={{content: initialContent}}
      onSubmit={onSubmit}
      onDelete={() => {}}
      isSubmitting={false}>
      {formikProps => <SiteNoteForm content={formikProps.values.content} />}
    </ScreenFormWrapper>,
    {route: 'EDIT_SITE_NOTE', initialState: testState},
  );
  const saveButton = () => screen.getByRole('button', {name: 'Save'});
  const input = () => screen.getByPlaceholderText('Start typing your note…');
  const typeNote = async (text: string) => {
    await act(async () => {
      fireEvent.changeText(input(), text);
    });
  };
  return {screen, saveButton, input, typeNote, onSubmit};
};

describe('ScreenFormWrapper note length validation', () => {
  test(`save is disabled until the note has at least ${SITE_NOTE_MIN_LENGTH} characters`, async () => {
    const {saveButton, typeNote} = renderForm('');

    expect(saveButton()).toBeDisabled();

    await typeNote('ab');
    expect(saveButton()).toBeDisabled();

    await typeNote('abc');
    expect(saveButton()).toBeEnabled();
  });

  test('whitespace does not count towards the minimum length', async () => {
    const {saveButton, typeNote} = renderForm('');

    await typeNote('   ');
    expect(saveButton()).toBeDisabled();

    await typeNote(' ab ');
    expect(saveButton()).toBeDisabled();

    await typeNote(' abc ');
    expect(saveButton()).toBeEnabled();
  });

  test('save is enabled immediately when editing an existing note', () => {
    const {saveButton} = renderForm('note 1 contents');

    expect(saveButton()).toBeEnabled();
  });

  test('submitting a too-short note is rejected by validation', async () => {
    const {saveButton, typeNote, onSubmit} = renderForm('valid note');

    await typeNote('ab');
    await act(async () => {
      fireEvent.press(saveButton());
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
