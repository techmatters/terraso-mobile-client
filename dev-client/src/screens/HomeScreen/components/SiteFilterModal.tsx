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

import {Column, FormControl, Select} from 'native-base';
import {Dispatch, SetStateAction} from 'react';
import {useTranslation} from 'react-i18next';
import {SiteFilter} from 'terraso-mobile-client/screens/HomeScreen/hooks/useFilterSites';
import {ProjectSelect} from 'terraso-mobile-client/components/ProjectSelect';
import {USER_ROLES} from 'terraso-mobile-client/constants';

type Props = {
  filter: SiteFilter;
  setFilter: Dispatch<SetStateAction<SiteFilter>>;
};

export const SiteFilterModal = ({filter, setFilter}: Props) => {
  const {t} = useTranslation();
  return (
    <Column>
      <FormControl>
        <FormControl.Label>
          {t('site.search.filter_projects')}
        </FormControl.Label>
        <ProjectSelect
          projectId={filter.projectId}
          setProjectId={projectId => setFilter(prev => ({...prev, projectId}))}
        />
      </FormControl>
      <FormControl>
        <FormControl.Label>{t('site.search.filter_role')}</FormControl.Label>
        <Select
          selectedValue={filter.role}
          onValueChange={role => setFilter(prev => ({...prev, role}) as any)}>
          {USER_ROLES.map(role => (
            <Select.Item
              label={t(`site.role.${role}`)}
              value={role}
              key={role}
            />
          ))}
        </Select>
      </FormControl>
    </Column>
  );
};
