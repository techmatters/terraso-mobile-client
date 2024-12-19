/*
 * Copyright © 2024 Technology Matters
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

import {useCallback} from 'react';

import {DepthInterval} from 'terraso-client-shared/graphqlSchema/graphql';

import {useMemoizedRequirements} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {isFlagEnabled} from 'terraso-mobile-client/config/featureFlags';
import {useSyncNotificationContext} from 'terraso-mobile-client/context/SyncNotificationContext';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {useSelector} from 'terraso-mobile-client/store';
import {
  selectSite,
  useSiteSoilInterval,
} from 'terraso-mobile-client/store/selectors';

export const useNavToBottomTabsAndShowSyncError = () => {
  const navigation = useNavigation();
  const syncNotifications = useSyncNotificationContext();

  return useCallback(() => {
    navigation.navigate('BOTTOM_TABS');
    if (isFlagEnabled('FF_offline')) {
      syncNotifications.showError();
    }
  }, [navigation, syncNotifications]);
};

export const usePopNavigationAndShowSyncError = () => {
  const navigation = useNavigation();
  const syncNotifications = useSyncNotificationContext();

  return useCallback(() => {
    navigation.pop();
    if (isFlagEnabled('FF_offline')) {
      syncNotifications.showError();
    }
  }, [navigation, syncNotifications]);
};

export const useNavToSiteAndShowSyncError = (siteId: string) => {
  const navigation = useNavigation();
  const syncNotifications = useSyncNotificationContext();

  return useCallback(() => {
    navigation.navigate('SITE_TABS', {siteId: siteId});
    if (isFlagEnabled('FF_offline')) {
      syncNotifications.showError();
    }
  }, [siteId, navigation, syncNotifications]);
};

export const useDefaultSiteDepthRequirements = (
  siteId: string,
  depthIntervalSpec: DepthInterval,
) => {
  const site = useSelector(selectSite(siteId));
  const realDepthInterval = useSiteSoilInterval(siteId, depthIntervalSpec);
  const handleMissingSite = useNavToBottomTabsAndShowSyncError();
  const handleMissingDepth = useNavToSiteAndShowSyncError(siteId);
  const requirements = useMemoizedRequirements([
    {data: site, doIfMissing: handleMissingSite},
    {data: realDepthInterval, doIfMissing: handleMissingDepth},
  ]);
  return requirements;
};
