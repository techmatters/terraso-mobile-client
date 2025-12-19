/*
 * Copyright © 2025 Technology Matters
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

import {DataExportScreen} from 'terraso-mobile-client/screens/DataExportScreen/DataExportScreen';
import {useSelector} from 'terraso-mobile-client/store';

/**
 * Wrapper for DataExportScreen configured for USER resource type
 * Gets user data from Redux and passes to generic DataExportScreen
 */
export function UserDataExportScreen() {
  const currentUser = useSelector(state => state.account.currentUser?.data);
  const userId = currentUser?.id;
  const username = currentUser?.email?.split('@')[0] ?? 'user';

  if (!userId) {
    // This shouldn't happen as this screen requires authentication
    // But handle gracefully just in case
    return null;
  }

  return (
    <DataExportScreen
      resourceType="USER"
      resourceId={userId}
      resourceName={username}
      scope="user_all"
    />
  );
}
