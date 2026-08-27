import React, {useEffect, useMemo, useRef} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import {theme} from 'terraso-mobile-client/theme';

/* NOTE: We created our own Switch component instead of using Switch from a library like react-native, due to constraints that prevented setting thumb and track colors consistently on iOS:
- ios_backgroundColor left an unpleasant border around the track when switch was on
- thumb color sometimes became white per iOS 26 defect https://github.com/react/react-native/issues/53856
*/

/* Display props shared with FormSwitch, which supplies value/onValueChange from Formik. New display props belong here so both components inherit them. */
export interface SharedSwitchProps {
  disabled?: boolean;
  /* Required: this is a stack of plain views, so without a label a screen reader has nothing to announce. */
  accessibilityLabel: string;
  testID?: string;
}

export interface SwitchProps extends SharedSwitchProps {
  value: boolean;
  onValueChange?: (value: boolean) => void;
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

const Switch: React.FC<SwitchProps> = ({
  value = false,
  onValueChange = () => {},
  disabled = false,
  accessibilityLabel,
  testID,
}) => {
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

    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.elastic(0.9),
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);
  // TODO-cknipe: animatedValue wasn't part of the dependency array, but the linter wanted it to be... should it be?

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback
        onPress={disabled ? undefined : () => onValueChange(!value)}
        /* Supplies what the native switch gets for free: a screen reader needs to know this is a switch, which way it is set, and whether it can be operated. */
        accessibilityRole="switch"
        accessibilityState={{checked: value, disabled}}
        accessibilityLabel={accessibilityLabel}
        testID={testID}>
        <Animated.View
          style={[styles.switchContainer, {backgroundColor: trackColor}]}>
          <Animated.View
            testID={testID && `${testID}-thumb`}
            style={[
              styles.switchWheelStyle,
              {marginLeft: moveSwitch, backgroundColor: thumbColor},
            ]}
          />
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
};

export default Switch;

const TRACK_WIDTH = 34;
const TRACK_HEIGHT = 14;
const THUMB_SIZE = 20;

/* Gap between the thumb and the nearer end of the track, applied at both ends so the off and on positions mirror each other. Zero sits the thumb flush with each end; a negative value lets it overhang, as Material's switch does. */
const THUMB_INSET = 0;

const SWITCH_LEFT_MARGIN = THUMB_INSET;
const SWITCH_RIGHT_MARGIN = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET;

/* The thumb is taller than the track and hangs past both of its ends, but only the track contributes to layout — so the container reserves the difference. Without it the thumb would be drawn over whatever sits beside the switch. */
const THUMB_OVERHANG_X = Math.max(0, -THUMB_INSET);
const THUMB_OVERHANG_Y = Math.max(0, (THUMB_SIZE - TRACK_HEIGHT) / 2);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THUMB_OVERHANG_X,
    paddingVertical: THUMB_OVERHANG_Y,
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
    /* boxShadow rather than the shadow* props, which are iOS-only, or elevation, which is Android-only and too faint here to match the shadow baked into the native switch's thumb drawable. */
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.3)',
  },
});
