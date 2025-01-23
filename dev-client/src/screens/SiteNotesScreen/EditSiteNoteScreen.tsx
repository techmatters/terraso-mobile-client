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

import {useCallback} from 'react';

import {
  useNavToBottomTabsAndShowSyncError,
  usePopNavigationAndShowSyncError,
} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {isFlagEnabled} from 'terraso-mobile-client/config/featureFlags';
import {useSyncNotificationContext} from 'terraso-mobile-client/context/SyncNotificationContext';
import {useUserCanEditSiteNote} from 'terraso-mobile-client/hooks/permissionHooks';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {SiteTabName} from 'terraso-mobile-client/navigation/navigators/SiteTabNavigator';
import {EditSiteNoteContent} from 'terraso-mobile-client/screens/SiteNotesScreen/components/EditSiteNoteContent';
import {useSelector} from 'terraso-mobile-client/store';
import {selectSite} from 'terraso-mobile-client/store/selectors';

type Props = {
  noteId: string;
  siteId: string;
};

export const EditSiteNoteScreen = ({noteId, siteId}: Props) => {
  const navigation = useNavigation();
  const syncNotifications = useSyncNotificationContext();

  const site = useSelector(state => selectSite(siteId)(state));
  const note = site?.notes[noteId];
  const userCanEditNote = useUserCanEditSiteNote({siteId, noteId});
  const handleMissingSite = useNavToBottomTabsAndShowSyncError();
  const handleMissingSiteNote = useCallback(() => {
    navigation.popTo('SITE_TABS', {
      siteId: siteId,
      initialTab: 'NOTES' as SiteTabName,
    });
    if (isFlagEnabled('FF_offline')) {
      syncNotifications.showError();
    }
  }, [navigation, siteId, syncNotifications]);
  const handleInsufficientPermissions = usePopNavigationAndShowSyncError();
  const requirements = useMemoizedRequirements([
    {data: site, doIfMissing: handleMissingSite},
    {data: note, doIfMissing: handleMissingSiteNote},
    {data: userCanEditNote, doIfMissing: handleInsufficientPermissions},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => <EditSiteNoteContent note={note} />}
    </ScreenDataRequirements>
  );
};
