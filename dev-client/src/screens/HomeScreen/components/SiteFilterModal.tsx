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
import {useTranslation} from 'react-i18next';
import {USER_ROLES} from 'terraso-mobile-client/constants';
import {
  TextInputFilter,
  ListFilterModal,
  SelectFilter,
} from 'terraso-mobile-client/components/ListFilter';
import {useSelector} from 'terraso-mobile-client/store';

type Props = {
  useDistance: boolean;
};

export const SiteFilterModal = ({useDistance}: Props) => {
  const {t} = useTranslation();

  const roleOptions = Object.fromEntries(
    USER_ROLES.map(role => [role, t(`site.role.${role}`)]),
  );

  const distanceSortingOptions = useDistance
    ? ['distanceAsc', 'distanceDesc']
    : [];

  const sortOptions = Object.fromEntries(
    [
      'nameAsc',
      'nameDesc',
      'lastModAsc',
      'lastModDesc',
      ...distanceSortingOptions,
    ].map(label => [label, t('site.search.sort.' + label)]),
  );

  const projects = useSelector(state => state.project.projects);

  const projectOptions = useMemo(
    () => ({
      ...Object.fromEntries(
        Object.values(projects).map(({id, name}) => [id, name]),
      ),
    }),
    [projects],
  );

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
        nullableOption={t('general.filter.no_sort')}
      />
      <SelectFilter
        label={t('site.search.filter_projects')}
        options={projectOptions}
        name="project"
        nullableOption={t('general.filter.no_project')}
      />
      <SelectFilter
        label={t('site.search.filter_role')}
        options={roleOptions}
        name="role"
        nullableOption={t('general.filter.no_role')}
      />
    </ListFilterModal>
  );
};
