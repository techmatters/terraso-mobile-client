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

import {memo, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';

import {ParamList} from 'terraso-mobile-client/navigation/types';
import {ScreenDefinitions} from 'terraso-mobile-client/navigation/types';
import {LocationDashboardContent} from 'terraso-mobile-client/screens/LocationScreens/LocationDashboardContent';
import {SiteNotesScreen} from 'terraso-mobile-client/screens/SiteNotesScreen/SiteNotesScreen';
import {SlopeScreen} from 'terraso-mobile-client/screens/SlopeScreen/SlopeScreen';
import {SoilScreen} from 'terraso-mobile-client/screens/SoilScreen/SoilScreen';
import {useDefaultTabOptions} from 'terraso-mobile-client/navigation/hooks/useDefaultTabOptions';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';

const tabDefinitions = {
  SITE: LocationDashboardContent,
  SLOPE: SlopeScreen,
  SOIL: SoilScreen,
  NOTES: SiteNotesScreen,
} satisfies ScreenDefinitions;

type TabsParamList = ParamList<typeof tabDefinitions>;
type ScreenName = keyof TabsParamList;

const Tab = createMaterialTopTabNavigator<TabsParamList>();

// TODO-cknipe: Add to LocationDashboardTabNavigator params something that sets it initialRouteName to whatever you want.
// TODO-cknipe: Anything special with memo()?
export const LocationDashboardTabNavigator = memo(
  (params: {siteId: string}) => {
    const {t} = useTranslation();
    const defaultOptions = useDefaultTabOptions();
    const tabs = useMemo(
      () =>
        Object.entries(tabDefinitions).map(([name, View]) => (
          <Tab.Screen
            name={name as ScreenName}
            key={name}
            initialParams={params}
            options={{...defaultOptions, tabBarLabel: t(`site.tabs.${name}`)}}
            children={props => (
              <View {...((props.route.params ?? {}) as any)} />
            )}
          />
        )),
      [params, t, defaultOptions],
    );

    return (
      <BottomSheetModalProvider>
        <Tab.Navigator initialRouteName="SITE">{tabs}</Tab.Navigator>
      </BottomSheetModalProvider>
    );
  },
);
