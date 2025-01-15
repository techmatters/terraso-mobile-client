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
  useNavToBottomTabsAndShowSyncError,
  usePopNavigationAndShowSyncError,
} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useRoleCanEditSite} from 'terraso-mobile-client/hooks/permissionHooks';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useSelector} from 'terraso-mobile-client/store';

type Props = {
  siteId: string;
};

export const SiteTeamSettingsScreen = ({siteId}: Props) => {
  const site = useSelector(state => state.site.sites[siteId]);

  const roleIsEditor = useRoleCanEditSite(siteId);
  const handleMissingSite = useNavToBottomTabsAndShowSyncError();
  const handleInsufficientPermissions = usePopNavigationAndShowSyncError();
  const requirements = useMemoizedRequirements([
    {data: site, doIfMissing: handleMissingSite},
    {data: roleIsEditor, doIfMissing: handleInsufficientPermissions},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScreenScaffold AppBar={<AppBar title={site.name} />}>
          <Text>Unimplemented team settings page</Text>
        </ScreenScaffold>
      )}
    </ScreenDataRequirements>
  );
};
