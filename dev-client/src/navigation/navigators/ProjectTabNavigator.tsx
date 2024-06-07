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

import {useTranslation} from 'react-i18next';

import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';

import {Icon, IconName} from 'terraso-mobile-client/components/icons/Icon';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useProjectRoleContext} from 'terraso-mobile-client/context/ProjectRoleContext';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/navigation/constants';
import {useDefaultTabOptions} from 'terraso-mobile-client/navigation/hooks/useDefaultTabOptions';
import {ProjectInputScreen} from 'terraso-mobile-client/screens/ProjectInputScreen/ProjectInputScreen';
import {ProjectSettingsScreen} from 'terraso-mobile-client/screens/ProjectSettingsScreen';
import {ProjectSitesScreen} from 'terraso-mobile-client/screens/ProjectSitesScreen';
import {ProjectTeamScreen} from 'terraso-mobile-client/screens/ProjectTeamScreen/ProjectTeamScreen';

// TODO: replace with real link
const TEMP_DOWNLOAD_LINK = 'https://s3.amazon.com/mydownload';

const Tab = createMaterialTopTabNavigator<TabStackParamList>();

type ScreenOptions = React.ComponentProps<
  (typeof Tab)['Navigator']
>['screenOptions'];

type Props = {projectId: string};

export const ProjectTabNavigator = ({projectId}: Props) => {
  const defaultTabOptions = useDefaultTabOptions();
  const {t} = useTranslation();

  const tabIconNames: Record<keyof TabStackParamList, IconName> = {
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
      tabBarLabel: ({color}) => {
        return (
          <Text color={color} textTransform="uppercase">
            {t(`projects.tabs.${route.name.toLowerCase()}`)}
          </Text>
        );
      },
    };
  };

  const userRole = useProjectRoleContext();

  // Can't user RestrictByUserRole component because of Navigator constraints
  // Children of Navigator must all be Screens
  const restrictScreen = (element: React.ReactNode) => {
    if (userRole === 'MANAGER') {
      return element;
    }
    return undefined;
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
      {restrictScreen(
        <Tab.Screen
          name={TabRoutes.SETTINGS}
          component={ProjectSettingsScreen}
          initialParams={{
            projectId,
            downloadLink: TEMP_DOWNLOAD_LINK,
          }}
        />,
      )}
    </Tab.Navigator>
  );
};
