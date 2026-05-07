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

/* Side-effect import: initializes i18next so the counter test below can
 * assert the rendered string. */
import 'terraso-mobile-client/translations';

/* The TValues generic on FormTextField forces callers to declare their form
 * shape so `name` is statically checked. We define a couple of test shapes
 * once and pass them as the explicit generic at each call site. */
type EmailForm = {email: string};
type NoteForm = {note: string};

/* validateOnMount runs Formik's validator in a post-mount useEffect, which
 * dispatches state updates after render() returns. We flush those updates
 * inside an act block here so React doesn't warn about updates not wrapped
 * in act. Tests that consume this helper become `async` accordingly. */
const renderInFormik = async (
  initialValues: Record<string, string>,
  children: React.ReactNode,
  options: {validate?: (v: any) => Record<string, string>} = {},
) => {
  const utils = render(
    <Formik
      initialValues={initialValues}
      onSubmit={() => {}}
      validate={options.validate}
      validateOnMount>
      {() => <>{children}</>}
    </Formik>,
  );
  await act(async () => {});
  return utils;
};

describe('FormTextField', () => {
  test('reads initial value from Formik', async () => {
    const {getByDisplayValue} = await renderInFormik(
      {email: 'a@b.com'},
      <FormTextField<EmailForm> name="email" testID="field" />,
    );

    expect(getByDisplayValue('a@b.com')).toBeTruthy();
  });

  test('does not show error before the field is touched (default onTouch)', async () => {
    const {queryByText} = await renderInFormik(
      {email: ''},
      <FormTextField<EmailForm> name="email" testID="field" />,
      {validate: () => ({email: 'Required'})},
    );

    expect(queryByText('Required')).toBeNull();
  });

  test('shows error after the field is blurred', async () => {
    const {queryByText, getByTestId} = await renderInFormik(
      {email: ''},
      <FormTextField<EmailForm> name="email" testID="field" />,
      {validate: () => ({email: 'Required'})},
    );

    await act(async () => {
      fireEvent(getByTestId('field'), 'blur');
    });

    expect(queryByText('Required')).toBeTruthy();
  });

  test('errorVisibility="always" shows error once validate has run', async () => {
    const {findByText} = await renderInFormik(
      {email: ''},
      <FormTextField<EmailForm>
        name="email"
        testID="field"
        errorVisibility="always"
      />,
      {validate: () => ({email: 'Required'})},
    );

    expect(await findByText('Required')).toBeTruthy();
  });

  test('updates Formik state on change', async () => {
    /* Capture the latest Formik bag via the render-prop child so the test
     * can read post-update state directly. */
    let latestValues: EmailForm = {email: ''};
    const {getByTestId} = render(
      <Formik<EmailForm> initialValues={{email: ''}} onSubmit={() => {}}>
        {formik => {
          latestValues = formik.values;
          return <FormTextField<EmailForm> name="email" testID="field" />;
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

    const {getByTestId} = await renderInFormik(
      {email: ''},
      <FormTextField<EmailForm>
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

    const {getByTestId} = await renderInFormik(
      {email: ''},
      <FormTextField<EmailForm>
        name="email"
        testID="field"
        onBlur={callerHandler}
      />,
    );

    await act(async () => {
      fireEvent(getByTestId('field'), 'blur');
    });

    expect(callerHandler).toHaveBeenCalled();
  });

  test('forwards display props (label, helperText, required) to TextField', async () => {
    const {getAllByText, queryByText} = await renderInFormik(
      {email: ''},
      <FormTextField<EmailForm>
        name="email"
        label="Email"
        helperText="We never share it"
        required
      />,
    );

    expect(getAllByText(/Email \*/).length).toBeGreaterThan(0);
    expect(queryByText('We never share it')).toBeTruthy();
  });

  test('renders counter when showCounter and maxLength are set', async () => {
    const {queryByText} = await renderInFormik(
      {note: 'abcde'},
      <FormTextField<NoteForm> name="note" maxLength={20} showCounter />,
    );

    expect(queryByText('5 / 20', {exact: false})).toBeTruthy();
  });

  test('throws a clear error when rendered outside a Formik provider', () => {
    /* Suppress two expected logs for this assertion:
     *   - Formik's "context is undefined" warning, which fires from
     *     useFormikContext() before our throw runs.
     *   - React's render-error logging triggered by the throw. */
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<FormTextField<EmailForm> name="email" />)).toThrow(
      /must be rendered inside a Formik provider/,
    );

    warnSpy.mockRestore();
    errSpy.mockRestore();
  });
});
