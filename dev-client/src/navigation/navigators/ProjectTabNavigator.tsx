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

import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {ProjectInputScreen} from 'terraso-mobile-client/screens/ProjectInputScreen';
import {ProjectTeamScreen} from 'terraso-mobile-client/screens/ProjectTeamScreen/ProjectTeamScreen';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/navigation/constants';
import {ProjectSettingsScreen} from 'terraso-mobile-client/screens/ProjectSettingsScreen';
import {ProjectSitesScreen} from 'terraso-mobile-client/screens/ProjectSitesScreen';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {useDefaultTabOptions} from 'terraso-mobile-client/navigation/hooks/useDefaultTabOptions';

const TEMP_DOWNLOAD_LINK = 'https://s3.amazon.com/mydownload';

const Tab = createMaterialTopTabNavigator<TabStackParamList>();

type ScreenOptions = React.ComponentProps<
  (typeof Tab)['Navigator']
>['screenOptions'];

type Props = {projectId: string};

export const ProjectTabNavigator = ({projectId}: Props) => {
  const defaultTabOptions = useDefaultTabOptions();

  const tabIconNames: Record<keyof TabStackParamList, string> = {
    Inputs: 'tune',
    Team: 'people',
    Settings: 'settings',
    Sites: 'location-on',
  };

  const screenOptions: ScreenOptions = ({route}) => {
    let iconName = tabIconNames[route.name];

    return {
      ...defaultTabOptions,
      tabBarIcon: ({color}) => {
        return <Icon name={iconName} color={color} />;
      },
    };
  };

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name={TabRoutes.INPUTS}
        component={ProjectInputScreen}
        initialParams={{
          projectId,
        }}
      />
      <Tab.Screen
        name={TabRoutes.SITES}
        component={ProjectSitesScreen}
        initialParams={{
          projectId,
        }}
      />
      <Tab.Screen
        name={TabRoutes.TEAM}
        component={ProjectTeamScreen}
        initialParams={{projectId}}
      />
      <Tab.Screen
        name={TabRoutes.SETTINGS}
        component={ProjectSettingsScreen}
        initialParams={{
          projectId,
          downloadLink: TEMP_DOWNLOAD_LINK,
        }}
      />
    </Tab.Navigator>
  );
};
