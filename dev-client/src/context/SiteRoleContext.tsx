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

import {createContext, useContext} from 'react';

import {
  selectUserRoleSite,
  SiteUserRole,
} from 'terraso-client-shared/selectors';

import {useSelector} from 'terraso-mobile-client/store';

const SiteRoleContext = createContext<SiteUserRole | null>(null);

type Props = {
  siteId: string;
} & React.PropsWithChildren;

export const useSiteRoleContext = () => {
  return useContext(SiteRoleContext);
};

export const SiteRoleContextProvider = ({siteId, children}: Props) => {
  const role = useSelector(state => selectUserRoleSite(state, siteId));

  return (
    <SiteRoleContext.Provider value={role}>{children}</SiteRoleContext.Provider>
  );
};
