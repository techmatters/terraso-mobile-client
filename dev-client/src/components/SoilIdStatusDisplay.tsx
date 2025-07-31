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

import {ReactNode} from 'react';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {ClientSoilIdStatus} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';

export type SoilIdStatusDisplayProps = {
  status: ClientSoilIdStatus;

  offline: ReactNode;
  loading: ReactNode;
  error: ReactNode;
  noData: ReactNode;
  data: ReactNode;
};
export const SoilIdStatusDisplay = ({
  status,
  offline,
  loading,
  error,
  noData,
  data,
}: SoilIdStatusDisplayProps) => {
  const isOffline = useIsOffline();
  if (status === 'loading') {
    /*
     * Don't show a loading indicator when offline. Other statuses indicate a completed Soil ID API call,
     * which are Ok to display to the user even in offline mode.
     */
    return isOffline ? offline : loading;
  } else if (
    status === 'error' ||
    status === 'ALGORITHM_FAILURE' ||
    status === 'TIMEOUT'
  ) {
    return error;
  } else if (status === 'DATA_UNAVAILABLE') {
    return noData;
  } else {
    return data;
  }
};
