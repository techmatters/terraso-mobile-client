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

import {fireEvent, render} from '@testing-library/react-native';

import {TextField} from 'terraso-mobile-client/components/inputs/TextField';

/* TextField is the controlled component — no Formik anywhere in these tests. */

describe('TextField', () => {
  test('renders with the supplied value', () => {
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

  test('calls onBlur when the input loses focus', () => {
    const onBlur = jest.fn();

    const {getByTestId} = render(
      <TextField
        value=""
        onChangeText={() => {}}
        onBlur={onBlur}
        testID="field"
      />,
    );
    fireEvent(getByTestId('field'), 'blur');

    expect(onBlur).toHaveBeenCalled();
  });

  test('appends asterisk to the label when required', () => {
    /* Paper renders the label in two animated nodes (active + inactive); we
     * tolerate either via getAllByText with a regex. */
    const {getAllByText} = render(
      <TextField value="" onChangeText={() => {}} label="Email" required />,
    );

    expect(getAllByText(/Email \*/).length).toBeGreaterThan(0);
  });

  test('announces "required" to screen readers when required (the visual asterisk does not)', () => {
    const {getByTestId} = render(
      <TextField
        value=""
        onChangeText={() => {}}
        label="Email"
        required
        testID="field"
      />,
    );

    expect(getByTestId('field').props.accessibilityLabel).toBe(
      'Email, required',
    );
  });

  test('uses plain label as accessibility label when not required', () => {
    const {getByTestId} = render(
      <TextField
        value=""
        onChangeText={() => {}}
        label="Email"
        testID="field"
      />,
    );

    expect(getByTestId('field').props.accessibilityLabel).toBe('Email');
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

  test('default errorVisibility hides error until the field has been blurred', () => {
    const {queryByText, getByTestId} = render(
      <TextField
        value=""
        onChangeText={() => {}}
        error="Required"
        testID="field"
      />,
    );

    expect(queryByText('Required')).toBeNull();

    fireEvent(getByTestId('field'), 'blur');

    expect(queryByText('Required')).toBeTruthy();
  });

  test('errorVisibility=always shows error before any interaction', () => {
    const {queryByText} = render(
      <TextField
        value=""
        onChangeText={() => {}}
        error="Required"
        errorVisibility="always"
      />,
    );

    expect(queryByText('Required')).toBeTruthy();
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
