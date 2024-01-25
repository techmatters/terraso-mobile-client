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

import {useMemo, useCallback, useRef} from 'react';
import {BottomSheetModal, BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {useTranslation} from 'react-i18next';

import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {useSelector} from 'terraso-mobile-client/store';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {AppBarIconButton} from 'terraso-mobile-client/navigation/components/AppBarIconButton';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {SiteScreen} from 'terraso-mobile-client/screens/SiteScreen/SiteScreen';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {LocationDashboardTabNavigator} from 'terraso-mobile-client/navigation/navigators/LocationDashboardTabNavigator';
import {PrivacyInfoModal} from 'terraso-mobile-client/components/infoModals/PrivacyInfoModal';
import {BottomSheetPrivacyModalContext} from 'terraso-mobile-client/context/BottomSheetPrivacyModalContext';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {selectUserRoleSite} from 'terraso-client-shared/selectors';
import {isSiteManager} from 'terraso-mobile-client/util';

type Props = {siteId?: string; coords?: Coords};

export const LocationDashboardScreen = ({siteId, coords}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const infoModalRef = useRef<BottomSheetModal>(null);
  const site = useSelector(state =>
    siteId === undefined ? undefined : state.site.sites[siteId],
  );
  if (coords === undefined) {
    coords = site!;
  }

  const userRole = useSelector(state =>
    siteId === undefined ? null : selectUserRoleSite(state, siteId),
  );

  const appBarRightButton = useMemo(() => {
    // display add button if no site associated with location
    if (!siteId) {
      return (
        <AppBarIconButton
          name="add"
          onPress={() => navigation.navigate('CREATE_SITE', {coords})}
        />
      );
    }

    // display nothing if user does not owner the site / is not manager
    if (userRole === null || !isSiteManager(userRole)) {
      return undefined;
    }

    // otherwise, show the settings
    return (
      <AppBarIconButton
        name="settings"
        onPress={() => navigation.navigate('SITE_SETTINGS', {siteId})}
      />
    );
  }, [siteId, coords, navigation, userRole]);

  const onInfoPress = useCallback(
    () => infoModalRef.current?.present(),
    [infoModalRef],
  );
  const onInfoClose = useCallback(
    () => infoModalRef.current?.dismiss(),
    [infoModalRef],
  );

  return (
    <BottomSheetPrivacyModalContext.Provider value={onInfoPress}>
      <BottomSheetModalProvider>
        <ScreenScaffold
          AppBar={
            <AppBar
              RightButton={appBarRightButton}
              title={site?.name ?? t('site.dashboard.default_title')}
            />
          }>
          {siteId ? (
            <SiteRoleContextProvider siteId={siteId}>
              <LocationDashboardTabNavigator siteId={siteId} />
            </SiteRoleContextProvider>
          ) : (
            <SiteScreen siteId={siteId} coords={coords} />
          )}
        </ScreenScaffold>
        <PrivacyInfoModal ref={infoModalRef} onClose={onInfoClose} />
      </BottomSheetModalProvider>
    </BottomSheetPrivacyModalContext.Provider>
  );
};
