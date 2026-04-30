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

import {FormTextField} from 'terraso-mobile-client/components/form/FormTextField';

/* validateOnMount populates errors after the initial commit, so tests that
 * read errors after mount either await findBy* or fire an event to flush
 * the resulting re-render. */
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

describe('FormTextField', () => {
  test('reads initial value from Formik', () => {
    const {getByDisplayValue} = renderInFormik(
      {email: 'a@b.com'},
      <FormTextField name="email" testID="field" />,
    );

    expect(getByDisplayValue('a@b.com')).toBeTruthy();
  });

  test('does not show error before the field is touched (default onTouch)', () => {
    const {queryByText} = renderInFormik(
      {email: ''},
      <FormTextField name="email" testID="field" />,
      {validate: () => ({email: 'Required'})},
    );

    expect(queryByText('Required')).toBeNull();
  });

  test('shows error after the field is blurred', async () => {
    const {queryByText, getByTestId} = renderInFormik(
      {email: ''},
      <FormTextField name="email" testID="field" />,
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
      <FormTextField name="email" testID="field" errorVisibility="always" />,
      {validate: () => ({email: 'Required'})},
    );

    expect(await findByText('Required')).toBeTruthy();
  });

  test('updates Formik state on change', async () => {
    /* Capture the latest Formik bag via the render-prop child so the test
     * can read post-update state directly. */
    let latestValues: Record<string, string> = {};
    const {getByTestId} = render(
      <Formik initialValues={{email: ''}} onSubmit={() => {}}>
        {formik => {
          latestValues = formik.values;
          return <FormTextField name="email" testID="field" />;
        }}
      </Formik>,
    );

    await act(async () => {
      fireEvent.changeText(getByTestId('field'), 'hello@example.com');
    });

    expect(latestValues.email).toBe('hello@example.com');
  });

  test('layered onChangeText runs after Formik update', async () => {
    const callerHandler = jest.fn();

    const {getByTestId} = renderInFormik(
      {email: ''},
      <FormTextField
        name="email"
        testID="field"
        onChangeText={callerHandler}
      />,
    );

    await act(async () => {
      fireEvent.changeText(getByTestId('field'), 'new');
    });

    expect(callerHandler).toHaveBeenCalledWith('new');
  });

  test('layered onBlur runs after Formik setFieldTouched', async () => {
    const callerHandler = jest.fn();

    const {getByTestId} = renderInFormik(
      {email: ''},
      <FormTextField name="email" testID="field" onBlur={callerHandler} />,
    );

    await act(async () => {
      fireEvent(getByTestId('field'), 'blur');
    });

    expect(callerHandler).toHaveBeenCalled();
  });

  test('forwards display props (label, helperText, required) to TextField', () => {
    const {getAllByText, queryByText} = renderInFormik(
      {email: ''},
      <FormTextField
        name="email"
        label="Email"
        helperText="We never share it"
        required
      />,
    );

    expect(getAllByText(/Email \*/).length).toBeGreaterThan(0);
    expect(queryByText('We never share it')).toBeTruthy();
  });

  test('renders counter when showCounter and maxLength are set', () => {
    const {queryByText} = renderInFormik(
      {note: 'abcde'},
      <FormTextField name="note" maxLength={20} showCounter />,
    );

    expect(queryByText('5 / 20')).toBeTruthy();
  });
});
