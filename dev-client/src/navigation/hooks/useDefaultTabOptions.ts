/*
 * Copyright © 2023 Technology Matters
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

import {useMemo} from 'react';

import {MaterialTopTabNavigationOptions} from '@react-navigation/material-top-tabs';
import {useTheme} from 'native-base';

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
