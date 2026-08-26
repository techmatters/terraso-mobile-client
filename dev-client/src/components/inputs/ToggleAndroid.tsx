import React, {useEffect, useMemo, useRef} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import {theme} from 'terraso-mobile-client/theme';

interface ToggleProps {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
}

/* Interpolation endpoints, [off, on], for each tone. A disabled toggle is drawn in its own muted colors rather than by fading the control, so its state stays legible. */
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

const Toggle: React.FC<ToggleProps> = ({
  value = false,
  onValueChange = () => {},
  disabled = false,
}) => {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  const moveToggle = useMemo(
    () =>
      animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [TOGGLE_LEFT_MARGIN, TOGGLE_RIGHT_MARGIN],
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

  useEffect(() => {
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
        onPress={disabled ? undefined : () => onValueChange(!value)}>
        <Animated.View
          style={[styles.toggleContainer, {backgroundColor: trackColor}]}>
          <Animated.View
            style={[
              styles.toggleWheelStyle,
              {marginLeft: moveToggle, backgroundColor: thumbColor},
            ]}
          />
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
};

export default Toggle;

const TRACK_WIDTH = 34;
const TRACK_HEIGHT = 14;
const THUMB_SIZE = 20;

/* Gap between the thumb and the nearer end of the track, applied at both ends so the off and on positions mirror each other. Zero sits the thumb flush with each end; a negative value lets it overhang, as Material's switch does. */
const THUMB_INSET = 0;

// TODO-cknipe: More like the Material Switch measurements
// const TRACK_WIDTH = 25;
// const TRACK_HEIGHT = 14;
// const THUMB_SIZE = 20;

// /* Gap between the thumb and the nearer end of the track, applied at both ends so the off and on positions mirror each other. Zero sits the thumb flush with each end; a negative value lets it overhang, as Material's switch does. */
// const THUMB_INSET = -6;

const TOGGLE_LEFT_MARGIN = THUMB_INSET;
const TOGGLE_RIGHT_MARGIN = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET;

/* The thumb is taller than the track and hangs past both of its ends, but only the track contributes to layout — so the container reserves the difference. Without it the thumb would be drawn over whatever sits beside the toggle. */
const THUMB_OVERHANG_X = Math.max(0, -THUMB_INSET);
const THUMB_OVERHANG_Y = Math.max(0, (THUMB_SIZE - TRACK_HEIGHT) / 2);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THUMB_OVERHANG_X,
    paddingVertical: THUMB_OVERHANG_Y,
  },
  toggleContainer: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleWheelStyle: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    /* boxShadow rather than the shadow* props, which are iOS-only, or elevation, which is Android-only and too faint here to match the shadow baked into the native switch's thumb drawable. */
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.3)',
  },
});

// TODO-cknipe:
// 1. Opacity or colors for disabled state?
// 2. Android vs iOS -- should they appear different?
// 3. Update all the other switches, tests, FormSwitch
// 4. Update Figma documentation
