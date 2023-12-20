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

import {Button} from 'native-base';
import {useTranslation} from 'react-i18next';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';

import {SiteScreen} from 'terraso-mobile-client/screens/SiteScreen/SiteScreen';
import {SiteNotesScreen} from 'terraso-mobile-client/screens/SiteNotesScreen/SiteNotesScreen';
import {SlopeScreen} from 'terraso-mobile-client/screens/SlopeScreen';
import {SoilScreen} from 'terraso-mobile-client/screens/SoilScreen/SoilScreen';
import {useDefaultTabOptions} from 'terraso-mobile-client/navigation/hooks/useDefaultTabOptions';
import {SpeedDial} from 'terraso-mobile-client/navigation/components/SpeedDial';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {
  LocationDashboardTabNavigatorParamList,
  LocationDashboardTabNavigatorScreens,
} from 'terraso-mobile-client/navigation/types';

import {useCallback, useRef} from 'react';
import {BottomSheetModal, BottomSheetModalProvider} from '@gorhom/bottom-sheet';

import {PrivacyInfoModal} from 'terraso-mobile-client/components/infoModals/PrivacyInfoModal';
import {BottomSheetPrivacyModalContext} from 'terraso-mobile-client/context/BottomSheetPrivacyModalContext';
import {
  RootNavigatorScreenProps,
  RootNavigatorScreens,
} from 'terraso-mobile-client/navigation/types';
import {LocationDataContext} from 'terraso-mobile-client/navigation/context/LocationDataContext';

const Tab =
  createMaterialTopTabNavigator<LocationDashboardTabNavigatorParamList>();

type Props =
  RootNavigatorScreenProps<RootNavigatorScreens.LOCATION_DASHBOARD_TABS>;

export const LocationDashboardTabNavigator = ({route}: Props) => {
  const siteId = 'siteId' in route.params ? route.params.siteId : undefined;

  const {t} = useTranslation();
  const defaultOptions = useDefaultTabOptions();
  const infoModalRef = useRef<BottomSheetModal>(null);

  const onInfoPress = useCallback(
    () => infoModalRef.current?.present(),
    [infoModalRef],
  );
  const onInfoClose = useCallback(
    () => infoModalRef.current?.dismiss(),
    [infoModalRef],
  );

  return (
    // Using Context for passing additional props that are shared between tab screens as per the docs:
    // https://reactnavigation.org/docs/hello-react-navigation/#passing-additional-props
    <LocationDataContext.Provider value={route.params}>
      <BottomSheetPrivacyModalContext.Provider value={onInfoPress}>
        <BottomSheetModalProvider>
          <Tab.Navigator
            initialRouteName={LocationDashboardTabNavigatorScreens.SITE}>
            <Tab.Screen
              name={LocationDashboardTabNavigatorScreens.SITE}
              component={SiteScreen}
              options={{
                ...defaultOptions,
                tabBarLabel: t(
                  `site.tabs.${LocationDashboardTabNavigatorScreens.SITE}`,
                ),
                tabBarStyle: {
                  display: siteId ? 'flex' : 'none',
                },
              }}
            />
            {siteId && (
              <>
                <Tab.Screen
                  name={LocationDashboardTabNavigatorScreens.SLOPE}
                  component={SlopeScreen}
                  options={{
                    ...defaultOptions,
                    tabBarLabel: t(
                      `site.tabs.${LocationDashboardTabNavigatorScreens.SLOPE}`,
                    ),
                  }}
                />
                <Tab.Screen
                  name={LocationDashboardTabNavigatorScreens.SOIL}
                  component={SoilScreen}
                  options={{
                    ...defaultOptions,
                    tabBarLabel: t(
                      `site.tabs.${LocationDashboardTabNavigatorScreens.SOIL}`,
                    ),
                  }}
                />
                <Tab.Screen
                  name={LocationDashboardTabNavigatorScreens.NOTES}
                  component={SiteNotesScreen}
                  options={{
                    ...defaultOptions,
                    tabBarLabel: t(
                      `site.tabs.${LocationDashboardTabNavigatorScreens.NOTES}`,
                    ),
                  }}
                />
              </>
            )}
          </Tab.Navigator>

          <SpeedDial>
            <Button variant="speedDial" leftIcon={<Icon name="description" />}>
              {t('site.dashboard.speed_dial.note_label')}
            </Button>
            <Button variant="speedDial" leftIcon={<Icon name="image" />}>
              {t('site.dashboard.speed_dial.photo_label')}
            </Button>
            <Button variant="speedDial" leftIcon={<Icon name="image" />}>
              {t('site.dashboard.speed_dial.bedrock_label')}
            </Button>
          </SpeedDial>
          <PrivacyInfoModal ref={infoModalRef} onClose={onInfoClose} />
        </BottomSheetModalProvider>
      </BottomSheetPrivacyModalContext.Provider>
    </LocationDataContext.Provider>
  );
};
