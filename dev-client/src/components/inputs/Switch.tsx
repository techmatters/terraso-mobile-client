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

import {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, Pressable, StyleSheet} from 'react-native';

import {theme} from 'terraso-mobile-client/theme';

/* NOTE: We created our own Switch component instead of using Switch from a library like react-native, due to constraints that prevented setting thumb and track colors consistently on iOS:
- ios_backgroundColor left an unpleasant border around the track when switch was on
- thumb color sometimes became white per iOS 26 defect https://github.com/react/react-native/issues/53856
*/

/* Display props shared with FormSwitch, which supplies value/onValueChange from Formik. New display props belong here so both components inherit them. */
export interface SharedSwitchProps {
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
}

export interface SwitchProps extends SharedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/* Interpolation endpoints, [off, on], for each tone. */
const TRACK = {
  normal: [theme.colors.switch.trackOff, theme.colors.switch.trackOn],
  disabled: [
    theme.colors.switch.trackOffDisabled,
    theme.colors.switch.trackOnDisabled,
  ],
};

const THUMB = {
  normal: [theme.colors.switch.thumbOff, theme.colors.switch.thumbOn],
  disabled: [
    theme.colors.switch.thumbOffDisabled,
    theme.colors.switch.thumbOnDisabled,
  ],
};

export const Switch = ({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  testID,
}: SwitchProps) => {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  const moveSwitch = useMemo(
    () =>
      animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [SWITCH_LEFT_MARGIN, SWITCH_RIGHT_MARGIN],
      }),
    [animatedValue],
  );

  const tone = disabled ? 'disabled' : 'normal';

  /* Interpolated rather than swapped on `value` so the colors cross-fade over the same 200ms the thumb takes to slide, instead of snapping at the start of it. */
  const trackColor = useMemo(
    () =>
      animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: TRACK[tone],
      }),
    [animatedValue, tone],
  );

  const thumbColor = useMemo(
    () =>
      animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: THUMB[tone],
      }),
    [animatedValue, tone],
  );

  /* Skipped on mount: animatedValue is already initialized to the current value, so animating on the first render would spend 200ms sliding from a position to itself. */
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    /* Runs on the JS thread because marginLeft is a layout property, which the native driver does not support. If these ever stutter — most likely on the depth sheet, where several switches animate while Formik re-renders the form around them — move the thumb to transform: [{translateX: moveSwitch}] and set useNativeDriver: true. Both transform and backgroundColor are natively animatable, so the whole animation would move to the UI thread. The catch: the native driver stops writing values back into the JS-side style, so the "animates to the on colors" test below cannot read the final color and would have to be rewritten or dropped. */
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.elastic(0.9),
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  return (
    <Pressable
      onPress={disabled ? undefined : () => onValueChange(!value)}
      disabled={disabled}
      /* Supplies what the native switch gets for free: a screen reader needs to know this is a switch, which way it is set, and whether it can be operated. */
      accessibilityRole="switch"
      accessibilityState={{checked: value, disabled}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={styles.container}>
      <Animated.View
        testID={testID && `${testID}-track`}
        style={[styles.switchContainer, {backgroundColor: trackColor}]}>
        <Animated.View
          testID={testID && `${testID}-thumb`}
          style={[
            styles.switchWheelStyle,
            {marginLeft: moveSwitch, backgroundColor: thumbColor},
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const TRACK_WIDTH = 34;
const TRACK_HEIGHT = 14;
const THUMB_SIZE = 20;

/* Gap between the thumb and the nearer end of the track, applied at both ends so the off and on positions mirror each other. Zero sits the thumb flush with each end; a negative value lets it overhang, as Material's switch does. */
const THUMB_INSET = 0;

const SWITCH_LEFT_MARGIN = THUMB_INSET;
const SWITCH_RIGHT_MARGIN = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET;

const TRACK_PADDING = 4;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: TRACK_PADDING,
  },
  switchContainer: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: 12,
    justifyContent: 'center',
  },
  switchWheelStyle: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.3)',
  },
});
