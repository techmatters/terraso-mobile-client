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

import {useDefaultTabOptions} from 'terraso-mobile-client/navigation/hooks/useDefaultTabOptions';
import {
  ParamList,
  ScreenDefinitions,
} from 'terraso-mobile-client/navigation/types';
import {SiteDashboardScreen} from 'terraso-mobile-client/screens/LocationScreens/SiteDashboardScreen';
import {SiteNotesScreen} from 'terraso-mobile-client/screens/SiteNotesScreen/SiteNotesScreen';
import {SlopeScreen} from 'terraso-mobile-client/screens/SlopeScreen/SlopeScreen';
import {SoilScreen} from 'terraso-mobile-client/screens/SoilScreen/SoilScreen';

type TabsParamList = ParamList<typeof tabDefinitions>;
export type SiteTabName = keyof TabsParamList;
const tabDefinitions = {
  SITE: SiteDashboardScreen,
  SLOPE: SlopeScreen,
  SOIL: SoilScreen,
  NOTES: SiteNotesScreen,
} satisfies ScreenDefinitions;

const Tab = createMaterialTopTabNavigator<TabsParamList>();

type Props = {
  siteId: string;
  initialTab: SiteTabName;
};
export const SiteTabNavigator = memo(({siteId, initialTab}: Props) => {
  const {t} = useTranslation();
  const defaultOptions = useDefaultTabOptions();
  const tabs = useMemo(
    () =>
      Object.entries(tabDefinitions).map(([name, View]) => (
        <Tab.Screen
          name={name as SiteTabName}
          key={name}
          initialParams={{siteId}}
          options={{...defaultOptions, tabBarLabel: t(`site.tabs.${name}`)}}
          children={props => <View {...((props.route.params ?? {}) as any)} />}
        />
      )),
    [siteId, t, defaultOptions],
  );

  return <Tab.Navigator initialRouteName={initialTab}>{tabs}</Tab.Navigator>;
});
