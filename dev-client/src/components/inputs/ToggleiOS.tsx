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

  /* Interpolated rather than swapped on `value` so the colors cross-fade over the same 200ms the thumb takes to slide, instead of snapping at the start of it. */
  const trackColor = useMemo(
    () =>
      animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [
          theme.colors.switch.trackOff,
          theme.colors.switch.trackOn,
        ],
      }),
    [animatedValue],
  );

  const thumbColor = useMemo(
    () =>
      animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [
          theme.colors.switch.thumbOff,
          theme.colors.switch.thumbOn,
        ],
      }),
    [animatedValue],
  );

  /* Fades the whole control rather than using the theme's Disabled colors: those exist to compensate for Android's color filter, and this component already dims everything at once. */
  const opacity = disabled ? 0.5 : 1;

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
          style={[
            styles.toggleContainer,
            {backgroundColor: trackColor, opacity},
          ]}>
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

const TOGGLE_LEFT_MARGIN = 3;
const TOGGLE_RIGHT_MARGIN = 22;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleContainer: {
    width: 50,
    height: 30,
    marginLeft: TOGGLE_LEFT_MARGIN,
    borderRadius: 15,
    justifyContent: 'center',
  },
  toggleWheelStyle: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 1.5,
  },
});
