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
  ProjectTabNavigatorScreens,
  ProjectTabNavigatorParamList,
} from 'terraso-mobile-client/navigation/types';
import {ProjectSettingsScreen} from 'terraso-mobile-client/screens/ProjectSettingsScreen';
import {ProjectSitesScreen} from 'terraso-mobile-client/screens/ProjectSitesScreen';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {useDefaultTabOptions} from 'terraso-mobile-client/navigation/hooks/useDefaultTabOptions';
import {useCallback, useRef} from 'react';
import {BottomSheetModal, BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {PrivacyInfoModal} from 'terraso-mobile-client/components/infoModals/PrivacyInfoModal';
import {BottomSheetPrivacyModalContext} from 'terraso-mobile-client/context/BottomSheetPrivacyModalContext';
import {
  RootNavigatorScreenProps,
  RootNavigatorScreens,
} from 'terraso-mobile-client/navigation/types';
import {ProjectDataContext} from 'terraso-mobile-client/navigation/context/ProjectDataContext';

const tabIconNames = {
  [ProjectTabNavigatorScreens.INPUTS]: 'tune',
  [ProjectTabNavigatorScreens.TEAM]: 'people',
  [ProjectTabNavigatorScreens.SETTINGS]: 'settings',
  [ProjectTabNavigatorScreens.SITES]: 'location-on',
};

const Tab = createMaterialTopTabNavigator<ProjectTabNavigatorParamList>();

type Props = RootNavigatorScreenProps<RootNavigatorScreens.PROJECT_TABS>;

export const ProjectTabNavigator = ({route: {params}}: Props) => {
  const infoModalRef = useRef<BottomSheetModal>(null);

  const onInfoPress = useCallback(
    () => infoModalRef.current?.present(),
    [infoModalRef],
  );
  const onInfoClose = useCallback(
    () => infoModalRef.current?.dismiss(),
    [infoModalRef],
  );

  const defaultTabOptions = useDefaultTabOptions();

  return (
    // Using Context for passing additional props that are shared between tab screens as per the docs:
    // https://reactnavigation.org/docs/hello-react-navigation/#passing-additional-props
    <ProjectDataContext.Provider value={params}>
      <BottomSheetPrivacyModalContext.Provider value={onInfoPress}>
        <BottomSheetModalProvider>
          <Tab.Navigator
            screenOptions={({route}) => ({
              ...defaultTabOptions,
              tabBarIcon: ({color}) => (
                <Icon name={tabIconNames[route.name]} color={color} />
              ),
            })}>
            <Tab.Screen
              name={ProjectTabNavigatorScreens.INPUTS}
              component={ProjectInputScreen}
            />
            <Tab.Screen
              name={ProjectTabNavigatorScreens.SITES}
              component={ProjectSitesScreen}
            />
            <Tab.Screen
              name={ProjectTabNavigatorScreens.TEAM}
              component={ProjectTeamScreen}
            />
            <Tab.Screen
              name={ProjectTabNavigatorScreens.SETTINGS}
              component={ProjectSettingsScreen}
            />
          </Tab.Navigator>
          <PrivacyInfoModal ref={infoModalRef} onClose={onInfoClose} />
        </BottomSheetModalProvider>
      </BottomSheetPrivacyModalContext.Provider>
    </ProjectDataContext.Provider>
  );
};
