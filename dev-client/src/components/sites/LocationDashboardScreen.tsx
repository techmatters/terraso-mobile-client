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

import {
  useNavigation,
  ParamList,
  ScreenDefinitions,
} from 'terraso-mobile-client/screens/AppScaffold';
import {useSelector} from 'terraso-mobile-client/model/store';
import {useTranslation} from 'react-i18next';
import {useMemo} from 'react';
import {
  AppBar,
  AppBarIconButton,
  ScreenCloseButton,
  ScreenScaffold,
} from 'terraso-mobile-client/screens/ScreenScaffold';
import {LocationDashboardView} from 'terraso-mobile-client/components/sites/LocationDashboardView';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {SiteNotesScreen} from 'terraso-mobile-client/components/siteNotes/SiteNotesScreen';
import {SlopeScreen} from 'terraso-mobile-client/components/dataInputs/SlopeScreen';
import {SoilScreen} from 'terraso-mobile-client/components/dataInputs/SoilScreen';
import {useDefaultTabOptions} from 'terraso-mobile-client/screens/TabBar';
import {SpeedDial} from 'terraso-mobile-client/components/common/SpeedDial';
import {Button} from 'native-base';
import {Icon} from 'terraso-mobile-client/components/common/Icons';

type Props = {siteId?: string; coords?: Coords};

const tabDefinitions = {
  SITE: LocationDashboardView,
  SLOPE: SlopeScreen,
  SOIL: SoilScreen,
  NOTES: SiteNotesScreen,
} satisfies ScreenDefinitions;
type TabsParamList = ParamList<typeof tabDefinitions>;
type ScreenName = keyof TabsParamList;

const Tab = createMaterialTopTabNavigator<TabsParamList>();

const LocationDashboardTabs = (params: {siteId: string}) => {
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
          children={props => <View {...((props.route.params ?? {}) as any)} />}
        />
      )),
    [params, t, defaultOptions],
  );

  return (
    <>
      <Tab.Navigator initialRouteName="SITE">{tabs}</Tab.Navigator>
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
    </>
  );
};

export const LocationDashboardScreen = ({siteId, coords}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const site = useSelector(state =>
    siteId === undefined ? undefined : state.site.sites[siteId],
  );
  if (coords === undefined) {
    coords = site!;
  }

  const appBarRightButton = useMemo(
    () =>
      siteId ? (
        <AppBarIconButton
          name="settings"
          onPress={() => navigation.navigate('SITE_SETTINGS', {siteId})}
        />
      ) : (
        <AppBarIconButton
          name="add"
          onPress={() => navigation.navigate('CREATE_SITE', {coords})}
        />
      ),
    [siteId, coords, navigation],
  );

  return (
    <ScreenScaffold
      AppBar={
        <AppBar
          LeftButton={<ScreenCloseButton />}
          RightButton={appBarRightButton}
          title={site?.name ?? t('site.dashboard.default_title')}
        />
      }>
      {siteId ? (
        <LocationDashboardTabs siteId={siteId} />
      ) : (
        <LocationDashboardView siteId={siteId} coords={coords} />
      )}
    </ScreenScaffold>
  );
};
