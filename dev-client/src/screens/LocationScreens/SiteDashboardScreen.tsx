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

import {Coords} from 'terraso-client-shared/types';

import {useNavToBottomTabsAndShowSyncError} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {ScreenDataRequirements} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {LocationDashboardContent} from 'terraso-mobile-client/screens/LocationScreens/LocationDashboardContent';
import {useSelector} from 'terraso-mobile-client/store';
import {selectSite} from 'terraso-mobile-client/store/selectors';

type Props = {
  siteId: string;
};
export const SiteDashboardScreen = ({siteId}: Props) => {
  const site = useSelector(selectSite(siteId));

  const handleMissingSite = useNavToBottomTabsAndShowSyncError();
  const requirements = [{data: site, doIfMissing: handleMissingSite}];

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <LocationDashboardContent
          site={site}
          coords={site as Coords}
          elevation={site?.elevation ?? undefined}
        />
      )}
    </ScreenDataRequirements>
  );
};
