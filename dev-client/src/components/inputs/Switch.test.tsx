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

import {
  Switch,
  switchColorProps,
} from 'terraso-mobile-client/components/inputs/Switch';
import {theme} from 'terraso-mobile-client/theme';

const colors = theme.colors.switch;

describe('switchColorProps', () => {
  test('uses the app green when on', () => {
    expect(switchColorProps(true, 'ios')).toStrictEqual({
      thumbColor: colors.thumbOn,
      trackColor: {true: colors.trackOn, false: undefined},
    });
  });

  test('uses a dark thumb when off (which makes the off state more easily visible if user is viewing screen in bright sunlight)', () => {
    expect(switchColorProps(false, 'ios').thumbColor).toBe(colors.thumbOff);
  });

  test('never sets an off-track color, since iOS cannot fill it', () => {
    expect(switchColorProps(false, 'ios').trackColor).toStrictEqual({
      true: colors.trackOn,
      false: undefined,
    });
    expect(switchColorProps(false, 'android').trackColor).toStrictEqual({
      true: colors.trackOn,
      false: undefined,
    });
  });

  test('keeps the enabled colors when disabled on iOS, which fades the switch itself', () => {
    expect(switchColorProps(true, 'ios', true)).toStrictEqual(
      switchColorProps(true, 'ios'),
    );
    expect(switchColorProps(false, 'ios', true)).toStrictEqual(
      switchColorProps(false, 'ios'),
    );
  });

  test('pre-fades the colors when disabled on Android, whose color filter overrides the disabled tint', () => {
    expect(switchColorProps(true, 'android', true)).toStrictEqual({
      thumbColor: colors.thumbOnDisabled,
      trackColor: {true: colors.trackOnDisabled, false: undefined},
    });
    expect(switchColorProps(false, 'android', true).thumbColor).toBe(
      colors.thumbOffDisabled,
    );
  });
});

const renderSwitch = (props: Partial<React.ComponentProps<typeof Switch>>) =>
  render(
    <Switch
      value={false}
      onValueChange={() => {}}
      accessibilityLabel="Soil color"
      testID="switch"
      {...props}
    />,
  ).getByTestId('switch');

describe('Switch', () => {
  test('calls onValueChange when toggled', () => {
    const onValueChange = jest.fn();

    fireEvent(renderSwitch({onValueChange}), 'valueChange', true);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  test('forwards the accessibility label so it is not announced as a bare switch', () => {
    expect(renderSwitch({}).props.accessibilityLabel).toBe('Soil color');
  });

  /* Guards the wiring switchColorProps can't see: that the colors are actually
   * spread onto the switch, with the arguments in the right order. React Native
   * remaps them per platform on the way through, and the unit suite runs as
   * iOS, where trackColor.true becomes onTintColor. */
  test('passes the colors through to the native switch', () => {
    const element = renderSwitch({value: true});

    expect(element.props.onTintColor).toBe(colors.trackOn);
    expect(element.props.thumbTintColor).toBe(colors.thumbOn);
  });
});
