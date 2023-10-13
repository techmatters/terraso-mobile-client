import {MaterialTopTabNavigationOptions} from '@react-navigation/material-top-tabs';
import {useTheme} from 'native-base';
import {useMemo} from 'react';

export const useDefaultTabOptions = (): MaterialTopTabNavigationOptions => {
  const {colors} = useTheme();
  return useMemo(
    () => ({
      tabBarScrollEnabled: true,
      tabBarActiveTintColor: colors.primary.contrast,
      tabBarInactiveTintColor: colors.secondary.main,
      tabBarItemStyle: {
        width: 'auto',
        flexDirection: 'row',
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingVertical: 9,
      },
      tabBarLabelStyle: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 24,
        letterSpacing: 0.4,
      },
      tabBarStyle: {
        backgroundColor: colors.grey[200],
      },
      tabBarIndicatorStyle: {
        backgroundColor: colors.secondary.main,
        height: '100%',
      },
      tabBarAndroidRipple: {
        color: '#FFFFFF00',
      },
    }),
    [colors],
  );
};
