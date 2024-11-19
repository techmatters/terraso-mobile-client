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

import {useContext} from 'react';

import {ConnectivityContext} from 'terraso-mobile-client/context/connectivity/ConnectivityContext';

export const useIsOffline = () => {
  const context = useContext(ConnectivityContext);

  // if we aren't sure yet whether we are on or offline, conservatively assume we are offline
  if (context.isOffline === null) {
    return true;
  }
  return context.isOffline;
};
