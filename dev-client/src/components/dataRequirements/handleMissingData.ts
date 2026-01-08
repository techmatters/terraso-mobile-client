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

import {isFlagEnabled} from 'terraso-mobile-client/config/featureFlags';
import {useSyncNotificationContext} from 'terraso-mobile-client/context/SyncNotificationContext';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

export const useNavToBottomTabsAndShowSyncError = (
  missingEntityType?: string,
) => {
  const navigation = useNavigation();
  const syncNotifications = useSyncNotificationContext();

  return useCallback(() => {
    navigation.popTo('BOTTOM_TABS');
    if (isFlagEnabled('FF_offline')) {
      syncNotifications.showError(
        missingEntityType
          ? {reason: 'missing_data', missingEntityType}
          : {reason: 'other'},
      );
    }
  }, [navigation, syncNotifications, missingEntityType]);
};

export const usePopNavigationAndShowSyncError = (
  missingEntityType?: string,
) => {
  const navigation = useNavigation();
  const syncNotifications = useSyncNotificationContext();

  return useCallback(() => {
    navigation.pop();
    if (isFlagEnabled('FF_offline')) {
      syncNotifications.showError(
        missingEntityType
          ? {reason: 'missing_data', missingEntityType}
          : {reason: 'other'},
      );
    }
  }, [navigation, syncNotifications, missingEntityType]);
};

export const useNavToSiteAndShowSyncError = (
  siteId: string,
  missingEntityType?: string,
) => {
  const navigation = useNavigation();
  const syncNotifications = useSyncNotificationContext();

  return useCallback(() => {
    navigation.popTo('SITE_TABS', {siteId: siteId});
    if (isFlagEnabled('FF_offline')) {
      syncNotifications.showError(
        missingEntityType
          ? {reason: 'missing_data', missingEntityType}
          : {reason: 'other'},
      );
    }
  }, [siteId, navigation, syncNotifications, missingEntityType]);
};
