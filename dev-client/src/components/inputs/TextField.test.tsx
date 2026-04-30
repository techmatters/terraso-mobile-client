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

import {act, fireEvent, render} from '@testing-library/react-native';
import {Formik} from 'formik';

import {TextField} from 'terraso-mobile-client/components/inputs/TextField';

/*
 * Tests focus on integration of the helpers into the rendered component:
 * does the right state flow into Paper's TextInput, does the bottom-row
 * (error/helper/counter) render correctly given the inputs.
 *
 * Pure logic (mode resolution rules, error visibility, formatters) is
 * covered exhaustively in TextField.helpers.test.ts.
 */

describe('TextField — controlled mode', () => {
  test('renders the input with the supplied value', () => {
    const {getByDisplayValue} = render(
      <TextField value="hello" onChangeText={() => {}} testID="field" />,
    );

    expect(getByDisplayValue('hello')).toBeTruthy();
  });

  test('calls onChangeText when text is typed', () => {
    const onChangeText = jest.fn();

    const {getByTestId} = render(
      <TextField value="" onChangeText={onChangeText} testID="field" />,
    );
    fireEvent.changeText(getByTestId('field'), 'new text');

    expect(onChangeText).toHaveBeenCalledWith('new text');
  });

  test('appends asterisk to the label when required', () => {
    /* Negative case (no asterisk when not required) is covered by
     * formatRequiredLabel's helper test; here we just verify the component
     * threads the prop through to Paper's TextInput label. Paper renders the
     * label inside two animated nodes (active + inactive), so we use a
     * regex + getAllByText to tolerate either matching configuration. */
    const {getAllByText} = render(
      <TextField value="" onChangeText={() => {}} label="Email" required />,
    );

    expect(getAllByText(/Email \*/).length).toBeGreaterThan(0);
  });

  test('shows helper text below the input when no error', () => {
    const {queryByText} = render(
      <TextField
        value=""
        onChangeText={() => {}}
        helperText="We never share it"
      />,
    );

    expect(queryByText('We never share it')).toBeTruthy();
  });

  test('shows error and hides helper text when error is set (errorVisibility=always)', () => {
    const {queryByText} = render(
      <TextField
        value=""
        onChangeText={() => {}}
        helperText="We never share it"
        error="Required"
        errorVisibility="always"
      />,
    );

    expect(queryByText('Required')).toBeTruthy();
    expect(queryByText('We never share it')).toBeNull();
  });

  test('renders character counter when showCounter and maxLength are set', () => {
    const {queryByText} = render(
      <TextField
        value="abcde"
        onChangeText={() => {}}
        maxLength={20}
        showCounter
      />,
    );

    expect(queryByText('5 / 20')).toBeTruthy();
  });

  test('does not render counter without showCounter', () => {
    const {queryByText} = render(
      <TextField value="abcde" onChangeText={() => {}} maxLength={20} />,
    );

    expect(queryByText('5 / 20')).toBeNull();
  });
});

describe('TextField — Formik mode', () => {
  /* validateOnMount populates errors after the initial commit, which matches
   * how forms behave once the user begins interacting. Tests that read errors
   * after mount use findByText or fire an event to flush the resulting
   * re-render. */
  const renderInFormik = (
    initialValues: Record<string, string>,
    children: React.ReactNode,
    options: {validate?: (v: any) => Record<string, string>} = {},
  ) =>
    render(
      <Formik
        initialValues={initialValues}
        onSubmit={() => {}}
        validate={options.validate}
        validateOnMount>
        {() => <>{children}</>}
      </Formik>,
    );

  test('reads initial value from Formik', () => {
    const {getByDisplayValue} = renderInFormik(
      {email: 'a@b.com'},
      <TextField name="email" testID="field" />,
    );

    expect(getByDisplayValue('a@b.com')).toBeTruthy();
  });

  test('does not show error before the field is touched (errorVisibility=onTouch)', () => {
    const {queryByText} = renderInFormik(
      {email: ''},
      <TextField name="email" testID="field" />,
      {validate: () => ({email: 'Required'})},
    );

    expect(queryByText('Required')).toBeNull();
  });

  test('shows error after the field is blurred', async () => {
    const {queryByText, getByTestId} = renderInFormik(
      {email: ''},
      <TextField name="email" testID="field" />,
      {validate: () => ({email: 'Required'})},
    );

    await act(async () => {
      fireEvent(getByTestId('field'), 'blur');
    });

    expect(queryByText('Required')).toBeTruthy();
  });

  test('errorVisibility="always" shows error once validate has run', async () => {
    const {findByText} = renderInFormik(
      {email: ''},
      <TextField name="email" testID="field" errorVisibility="always" />,
      {validate: () => ({email: 'Required'})},
    );

    expect(await findByText('Required')).toBeTruthy();
  });

  test('layered onChangeText runs after Formik update', async () => {
    const callerHandler = jest.fn();

    const {getByTestId} = renderInFormik(
      {email: ''},
      <TextField name="email" testID="field" onChangeText={callerHandler} />,
    );

    await act(async () => {
      fireEvent.changeText(getByTestId('field'), 'new');
    });

    expect(callerHandler).toHaveBeenCalledWith('new');
  });
});
