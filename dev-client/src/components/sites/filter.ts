import {useMemo} from 'react';
import {UserRole} from 'terraso-client-shared/graphqlSchema/graphql';
import {Site} from 'terraso-client-shared/site/siteSlice';

export type SiteFilter = {
  projectId?: string;
  role?: UserRole;
};

export const useFilterSites = (
  sites: Site[],
  roleMap: Record<string, UserRole | undefined>,
  filter: SiteFilter,
) =>
  useMemo(
    () =>
      sites.filter(site => {
        const matchesProject =
          filter.projectId === undefined || filter.projectId === site.projectId;
        let matchesRole = true;
        if (filter.role) {
          const siteRole = roleMap[site.id];
          matchesRole = siteRole === filter.role;
        }
        return matchesProject && matchesRole;
      }),
    [sites, filter, roleMap],
  );
