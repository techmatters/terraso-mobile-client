import {useMemo} from 'react';
import {Site} from 'terraso-client-shared/site/siteSlice';

export type SiteFilter = {
  projectId?: string;
  // TODO: update once there is a LPKS-specific type for this
  role?: 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER';
};

export const useFilterSites = (sites: Site[], filter: SiteFilter) =>
  useMemo(
    () =>
      sites.filter(
        site =>
          filter.projectId === undefined || filter.projectId === site.projectId,
      ),
    [sites, filter],
  );
