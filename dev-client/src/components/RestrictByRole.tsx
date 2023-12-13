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
import {SiteUserRole} from 'terraso-client-shared/selectors';
import {useSiteRoleContext} from 'terraso-mobile-client/context/SiteRoleContext';

type RestrictSiteRoleProps = {
  role: SiteUserRole | SiteUserRole[];
} & React.PropsWithChildren;

/** Only display child components with specified site role */
export const RestrictBySiteRole = ({role, children}: RestrictSiteRoleProps) => {
  const siteRole = useSiteRoleContext();
  const display = useMemo(() => {
    if (siteRole === null) {
      return false;
    }
    if (role instanceof Array) {
      return (
        role.filter(
          ({kind, role: userRole}) =>
            siteRole.kind === kind && siteRole.role === userRole,
        ).length > 0
      );
    }
    return role === siteRole;
  }, [siteRole, role]);

  return display ? children : <></>;
};
