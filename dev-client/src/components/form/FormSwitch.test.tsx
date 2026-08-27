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

import {FormSwitch} from 'terraso-mobile-client/components/form/FormSwitch';

/* The TValues generic on FormSwitch forces callers to declare their form shape
 * so `name` is statically checked against their boolean fields. */
type ToggleForm = {enabled: boolean};
/* A form whose field may be absent, to pin down what the switch shows then. */
type PartialToggleForm = {enabled?: boolean};

const renderInFormik = async (
  initialValues: Record<string, boolean>,
  children: React.ReactNode,
) => {
  const utils = render(
    <Formik initialValues={initialValues} onSubmit={() => {}}>
      {() => <>{children}</>}
    </Formik>,
  );
  await act(async () => {});
  return utils;
};

/* Comfortably longer than the switch's 200ms color/slide animation. */
const ANIMATION_MS = 500;

/* The toggle is a press target rather than a native switch, so this is what a
 * user actually does. Direction comes from the seeded value: the suite drives
 * it both ways so a handler that always wrote `true` would fail.
 *
 * Flipping the value starts an animation whose frames update state, and those
 * updates land after the press returns — the "not wrapped in act" warning. So
 * the animation is run out inside a second act. Fake timers are switched on
 * only around the press, because enabling them for the whole suite hangs
 * render and cleanup. */
const press = async (getByTestId: ReturnType<typeof render>['getByTestId']) => {
  jest.useFakeTimers();

  await act(async () => {
    fireEvent.press(getByTestId('switch'));
  });
  await act(async () => {
    jest.advanceTimersByTime(ANIMATION_MS);
  });

  jest.useRealTimers();
};

/* The toggle reports its state to assistive tech rather than through a `value`
 * prop, which is also the only thing a screen reader user can perceive. */
const isOn = (element: ReturnType<ReturnType<typeof render>['getByTestId']>) =>
  element.props.accessibilityState.checked;

describe('FormSwitch', () => {
  test('reads initial value from Formik', async () => {
    const {getByTestId} = await renderInFormik(
      {enabled: true},
      <FormSwitch<ToggleForm>
        name="enabled"
        accessibilityLabel="Soil color"
        testID="switch"
      />,
    );

    expect(isOn(getByTestId('switch'))).toBe(true);
  });

  test('shows off when the field is missing, rather than an indeterminate switch', async () => {
    const {getByTestId} = await renderInFormik(
      {},
      <FormSwitch<PartialToggleForm>
        name="enabled"
        accessibilityLabel="Soil color"
        testID="switch"
      />,
    );

    expect(isOn(getByTestId('switch'))).toBe(false);
  });

  test('updates Formik state on change', async () => {
    /* Capture the latest Formik bag via the render-prop child so the test can
     * read post-update state directly. */
    let latestValues: ToggleForm = {enabled: false};
    const {getByTestId} = render(
      <Formik<ToggleForm> initialValues={{enabled: false}} onSubmit={() => {}}>
        {formik => {
          latestValues = formik.values;
          return (
            <FormSwitch<ToggleForm>
              name="enabled"
              accessibilityLabel="Soil color"
              testID="switch"
            />
          );
        }}
      </Formik>,
    );

    await press(getByTestId);

    expect(latestValues.enabled).toBe(true);
  });

  test('writes the off value too, not just on', async () => {
    let latestValues: ToggleForm = {enabled: true};
    const {getByTestId} = render(
      <Formik<ToggleForm> initialValues={{enabled: true}} onSubmit={() => {}}>
        {formik => {
          latestValues = formik.values;
          return (
            <FormSwitch<ToggleForm>
              name="enabled"
              accessibilityLabel="Soil color"
              testID="switch"
            />
          );
        }}
      </Formik>,
    );

    await press(getByTestId);

    expect(latestValues.enabled).toBe(false);
  });

  test('writes only the named field, leaving the rest of the form alone', async () => {
    let latestValues = {enabled: false, other: false};
    const {getByTestId} = render(
      <Formik
        initialValues={{enabled: false, other: false}}
        onSubmit={() => {}}>
        {formik => {
          latestValues = formik.values;
          return (
            <FormSwitch<typeof latestValues>
              name="enabled"
              accessibilityLabel="Soil color"
              testID="switch"
            />
          );
        }}
      </Formik>,
    );

    await press(getByTestId);

    expect(latestValues).toEqual({enabled: true, other: false});
  });

  test('layered onValueChange runs after Formik update', async () => {
    const callerHandler = jest.fn();

    const {getByTestId} = await renderInFormik(
      {enabled: false},
      <FormSwitch<ToggleForm>
        name="enabled"
        accessibilityLabel="Soil color"
        testID="switch"
        onValueChange={callerHandler}
      />,
    );

    await press(getByTestId);

    expect(callerHandler).toHaveBeenCalledWith(true);
  });

  test('forwards display props to the toggle', async () => {
    const {getByTestId} = await renderInFormik(
      {enabled: false},
      <FormSwitch<ToggleForm>
        name="enabled"
        accessibilityLabel="Soil color"
        testID="switch"
        disabled
      />,
    );

    const element = getByTestId('switch');
    expect(element.props.accessibilityLabel).toBe('Soil color');
    expect(element.props.accessibilityState.disabled).toBe(true);
  });

  /* Compile-time assertion rather than a runtime one: if BooleanFieldKeys ever
   * loosens to plain string, the @ts-expect-error below becomes unused and
   * check-ts fails. */
  test('constrains name to the form"s boolean fields', () => {
    const pointedAtAString = (
      <FormSwitch<{enabled: boolean; label: string}>
        // @ts-expect-error - `label` is a string field, so it is not a valid switch target.
        name="label"
        accessibilityLabel="Soil color"
      />
    );

    expect(pointedAtAString).toBeTruthy();
  });

  test('throws a clear error when rendered outside a Formik provider', () => {
    /* Suppress two expected logs for this assertion:
     *   - Formik's "context is undefined" warning, which fires from
     *     useFormikContext() before our throw runs.
     *   - React's render-error logging triggered by the throw. */
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      render(
        <FormSwitch<ToggleForm>
          name="enabled"
          accessibilityLabel="Soil color"
        />,
      ),
    ).toThrow(/must be rendered inside a Formik provider/);

    warnSpy.mockRestore();
    errSpy.mockRestore();
  });
});
