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

import {AppBarIconButton} from 'terraso-mobile-client/components/buttons/icons/appBar/AppBarIconButton';
import {useNavToBottomTabsAndShowSyncError} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {isSiteManager} from 'terraso-mobile-client/model/permissions/permissions';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  SiteTabName,
  SiteTabNavigator,
} from 'terraso-mobile-client/navigation/navigators/SiteTabNavigator';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useSelector} from 'terraso-mobile-client/store';
import {
  selectSite,
  selectUserRoleSite,
} from 'terraso-mobile-client/store/selectors';

type Props = {
  siteId: string;
  initialTab?: SiteTabName;
};

// A "Location" can refer to a "Site" (with siteId) xor a "Temporary Location" (with only coords)
export const SiteTabsScreen = (props: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const initialTab = props.initialTab === undefined ? 'SITE' : props.initialTab;

  const siteId = props.siteId;
  const site = useSelector(state => selectSite(siteId)(state));
  const userRole = useSelector(state => selectUserRoleSite(state, siteId));

  const handleMissingSite = useNavToBottomTabsAndShowSyncError('site');
  const requirements = useMemoizedRequirements([
    {data: site, doIfMissing: handleMissingSite},
  ]);

  const appBarRightButton = useMemo(() => {
    // display nothing if user does not own the site / is not manager
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
  }, [siteId, navigation, userRole]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScreenScaffold
          AppBar={
            <AppBar
              RightButton={appBarRightButton}
              title={site?.name ?? t('site.dashboard.default_title')}
            />
          }>
          <SiteRoleContextProvider siteId={siteId}>
            <SiteTabNavigator siteId={siteId} initialTab={initialTab} />
          </SiteRoleContextProvider>
        </ScreenScaffold>
      )}
    </ScreenDataRequirements>
  );
};
