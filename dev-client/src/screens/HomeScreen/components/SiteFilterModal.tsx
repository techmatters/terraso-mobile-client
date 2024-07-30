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

import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {PROJECT_ROLES} from 'terraso-client-shared/project/projectSlice';

import {
  ListFilterModal,
  SelectFilter,
  TextInputFilter,
} from 'terraso-mobile-client/components/ListFilter';
import {useSelector} from 'terraso-mobile-client/store';

type Props = {
  useDistance: boolean;
};

const generalSortingOptions = [
  'nameAsc',
  'nameDesc',
  'lastModAsc',
  'lastModDesc',
];

const distanceSortingOptions = [
  ...generalSortingOptions,
  'distanceAsc',
  'distanceDesc',
];

export const SiteFilterModal = ({useDistance}: Props) => {
  const {t} = useTranslation();

  const sortOptions = useMemo(
    () => (useDistance ? distanceSortingOptions : generalSortingOptions),
    [useDistance],
  );
  const renderSortOption = useCallback(
    (option: string) => t(`site.search.sort.${option}`),
    [t],
  );

  const renderRole = useCallback(
    (role: string) => t(`general.role.${role}`),
    [t],
  );

  const projects = useSelector(state => state.project.projects);
  const projectIds = useMemo(() => Object.keys(projects), [projects]);
  const renderProject = useCallback(
    (id: string) => projects[id].name,
    [projects],
  );
  const projectKey = useCallback((id: string) => id, []);

  return (
    <ListFilterModal
      searchInput={
        <TextInputFilter
          placeholder={t('site.search.placeholder')}
          label={t('site.search.accessibility_label')}
          name="search"
        />
      }>
      <SelectFilter
        label={t('site.search.sort.label')}
        options={sortOptions}
        name="sort"
        renderValue={renderSortOption}
        unselectedLabel={t('general.filter.no_sort')}
      />
      <SelectFilter
        label={t('site.search.filter_projects')}
        options={projectIds}
        optionKey={projectKey}
        renderValue={renderProject}
        name="project"
        unselectedLabel={t('general.filter.no_project')}
      />
      <SelectFilter
        label={t('site.search.filter_role')}
        options={PROJECT_ROLES}
        renderValue={renderRole}
        name="role"
        unselectedLabel={t('general.filter.no_role')}
      />
    </ListFilterModal>
  );
};
