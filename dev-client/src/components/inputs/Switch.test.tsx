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

import {processColor, StyleSheet} from 'react-native';

import {act, fireEvent, render} from '@testing-library/react-native';

import Switch from 'terraso-mobile-client/components/inputs/Switch';
import {theme} from 'terraso-mobile-client/theme';

/* This is a hand-built control rather than a native switch, so everything a
 * platform switch provides for free — the role, the on/off state, ignoring
 * presses while disabled, the colors themselves — is ours to get right. */

const colors = theme.colors.switch;

const switchProps = (props: Partial<React.ComponentProps<typeof Switch>>) => ({
  value: false,
  onValueChange: () => {},
  accessibilityLabel: 'Soil color',
  testID: 'switch',
  ...props,
});

const renderSwitchParts = (
  props: Partial<React.ComponentProps<typeof Switch>>,
) => {
  const utils = render(<Switch {...switchProps(props)} />);

  /* The animated colors arrive here already resolved, as rgba() strings. */
  const colorOf = (testID: string) =>
    StyleSheet.flatten(utils.getByTestId(testID).props.style).backgroundColor;

  return {
    ...utils,
    track: () => colorOf('switch'),
    thumb: () => colorOf('switch-thumb'),
  };
};

const renderSwitch = (props: Partial<React.ComponentProps<typeof Switch>>) =>
  renderSwitchParts(props).getByTestId('switch');

/* Compared through processColor so the assertion doesn't care whether a color
 * is written as hex in the theme and read back as rgba() from the style. */
const expectColor = (actual: unknown, expected: string) =>
  expect(processColor(actual as string)).toBe(processColor(expected));

describe('Switch', () => {
  test('turns on when pressed while off', () => {
    const onValueChange = jest.fn();

    fireEvent.press(renderSwitch({value: false, onValueChange}));

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  test('turns off when pressed while on', () => {
    const onValueChange = jest.fn();

    fireEvent.press(renderSwitch({value: true, onValueChange}));

    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  test('ignores presses when disabled', () => {
    const onValueChange = jest.fn();

    fireEvent.press(renderSwitch({onValueChange, disabled: true}));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  test('announces itself as a switch, so it is not read as a plain button', () => {
    expect(renderSwitch({}).props.accessibilityRole).toBe('switch');
  });

  test('reports its state to assistive tech, which cannot see the thumb move', () => {
    expect(renderSwitch({value: true}).props.accessibilityState).toEqual({
      checked: true,
      disabled: false,
    });
    expect(renderSwitch({value: false}).props.accessibilityState).toEqual({
      checked: false,
      disabled: false,
    });
  });

  test('reports being disabled, so it is not announced as operable', () => {
    expect(
      renderSwitch({disabled: true}).props.accessibilityState.disabled,
    ).toBe(true);
  });

  test('forwards the accessibility label', () => {
    expect(renderSwitch({}).props.accessibilityLabel).toBe('Soil color');
  });

  test('draws the off state in the off colors', () => {
    const {track, thumb} = renderSwitchParts({value: false});

    expectColor(track(), colors.trackOff);
    expectColor(thumb(), colors.thumbOff);
  });

  test('draws the on state in the app green', () => {
    const {track, thumb} = renderSwitchParts({value: true});

    expectColor(track(), colors.trackOn);
    expectColor(thumb(), colors.thumbOn);
  });

  test('draws a disabled on switch in the muted colors, so it still reads as on', () => {
    const {track, thumb} = renderSwitchParts({value: true, disabled: true});

    expectColor(track(), colors.trackOnDisabled);
    expectColor(thumb(), colors.thumbOnDisabled);
  });

  test('draws a disabled off switch in the muted colors', () => {
    const {track, thumb} = renderSwitchParts({value: false, disabled: true});

    expectColor(track(), colors.trackOffDisabled);
    expectColor(thumb(), colors.thumbOffDisabled);
  });

  /* The colors cross-fade over 200ms rather than switching outright, so this
   * runs the animation out and checks where it lands. */
  test('animates to the on colors when the value changes', () => {
    jest.useFakeTimers();
    const {track, thumb, rerender} = renderSwitchParts({value: false});

    act(() => {
      rerender(<Switch {...switchProps({value: true})} />);
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expectColor(track(), colors.trackOn);
    expectColor(thumb(), colors.thumbOn);
    jest.useRealTimers();
  });
});
