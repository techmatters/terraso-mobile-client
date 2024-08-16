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
import {useTranslation} from 'react-i18next';

import {selectSite, selectUserRoleSite} from 'terraso-client-shared/selectors';
import {useSoilIdData} from 'terraso-client-shared/soilId/soilIdHooks';
import {Coords} from 'terraso-client-shared/types';

import {AppBarIconButton} from 'terraso-mobile-client/components/buttons/icons/appBar/AppBarIconButton';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {isSiteManager} from 'terraso-mobile-client/model/permissions/permissions';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  SiteLocationDashboardTabNavigator,
  SiteTabName,
} from 'terraso-mobile-client/navigation/navigators/SiteLocationDashboardTabNavigator';
import {LocationDashboardContent} from 'terraso-mobile-client/screens/LocationScreens/LocationDashboardContent';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useSelector} from 'terraso-mobile-client/store';

type Props = ({siteId: string} | {coords: Coords} | {elevation: number}) & {
  initialTab?: SiteTabName;
};

// A "Location" can refer to a "Site" (with siteId) xor a "Temporary Location" (with only coords)
export const LocationDashboardScreen = (props: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const initialTab = props.initialTab === undefined ? 'SITE' : props.initialTab;

  const siteId = 'siteId' in props ? props.siteId : undefined;
  const site = useSelector(state =>
    siteId === undefined ? undefined : selectSite(siteId)(state),
  );
  const coords = 'coords' in props ? props.coords : site!;

  const elevation = 'elevation' in props ? props.elevation : undefined;

  const userRole = useSelector(state =>
    siteId === undefined ? null : selectUserRoleSite(state, siteId),
  );

  useSoilIdData(coords, siteId);

  const appBarRightButton = useMemo(() => {
    // display nothing if no site associated with location or
    // user does not own the site / is not manager
    if (!siteId || userRole === null || !isSiteManager(userRole)) {
      return undefined;
    }

    // otherwise, show the settings
    return (
      <AppBarIconButton
        name="settings"
        onPress={() => navigation.navigate('SITE_SETTINGS', {siteId})}
      />
    );
  }, [siteId, navigation, userRole]);

  return (
    <ScreenScaffold
      AppBar={
        <AppBar
          RightButton={appBarRightButton}
          title={site?.name ?? t('site.dashboard.default_title')}
        />
      }>
      {siteId ? (
        <SiteRoleContextProvider siteId={siteId}>
          <SiteLocationDashboardTabNavigator
            siteId={siteId}
            initialTab={initialTab}
          />
        </SiteRoleContextProvider>
      ) : (
        <LocationDashboardContent
          siteId={siteId}
          coords={coords}
          elevation={elevation}
        />
      )}
    </ScreenScaffold>
  );
};
