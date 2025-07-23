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
import {ActivityIndicator} from 'react-native-paper';

import {PROJECT_ROLES} from 'terraso-client-shared/project/projectTypes';
import {normalizeText} from 'terraso-client-shared/utils';

import {AddButton} from 'terraso-mobile-client/components/buttons/common/AddButton';
import {
  ListFilterModal,
  ListFilterProvider,
  SelectFilter,
  TextInputFilter,
} from 'terraso-mobile-client/components/ListFilter';
import {
  Box,
  Column,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {OfflineAlert} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/alertBoxes/OfflineAlert';
import {ProjectList} from 'terraso-mobile-client/screens/ProjectListScreen/components/ProjectList';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useSelector} from 'terraso-mobile-client/store';
import {
  selectProjects,
  selectProjectUserRolesMap,
} from 'terraso-mobile-client/store/selectors';
import {equals, searchText} from 'terraso-mobile-client/util';

const SORT_OPTIONS = ['nameAsc', 'nameDesc', 'lastModAsc', 'lastModDesc'];

export const ProjectListScreen = () => {
  const allProjects = useSelector(selectProjects);
  const activeProjects = useMemo(
    () => Object.values(allProjects).filter(project => !project.archived),
    [allProjects],
  );
  const projectRoleLookup = useSelector(selectProjectUserRolesMap);

  const {t} = useTranslation();
  const navigation = useNavigation();
  const onPress = useCallback(
    () => navigation.navigate('CREATE_PROJECT'),
    [navigation],
  );
  const isLoadingData = useSelector(
    state => state.soilData.status === 'loading',
  );
  const renderSortOption = useCallback(
    (option: string) => t(`projects.search.${option}`),
    [t],
  );

  const renderRole = useCallback(
    (role: string) => t(`general.role.${role}`),
    [t],
  );

  const isOffline = useIsOffline();

  return (
    <ScreenScaffold AppBar={<AppBar LeftButton={null} />}>
      <Column
        bg="grey.200"
        p={5}
        flexGrow={1}
        flexShrink={0}
        flexBasis="70%"
        space="10px">
        <>
          {isLoadingData ? (
            <ActivityIndicator size="large" />
          ) : (
            activeProjects.length === 0 && (
              <Box mb="md">
                <Text bold>{t('projects.none.header')}</Text>
                <Text>{t('projects.none.info')}</Text>
              </Box>
            )
          )}
          {isOffline ? (
            <OfflineAlert message={t('projects.offline_create')} />
          ) : (
            <Box alignItems="flex-start" pb="md">
              <AddButton
                label={t('projects.create_button')}
                onPress={onPress}
              />
            </Box>
          )}
          {activeProjects.length > 0 && (
            <ListFilterProvider
              items={activeProjects}
              filters={{
                search: {
                  kind: 'filter',
                  f: searchText,
                  preprocess: normalizeText,
                  lookup: {key: 'name'},
                  hide: true,
                },
                role: {
                  kind: 'filter',
                  f: equals,
                  lookup: {key: 'id', record: projectRoleLookup},
                },
                sort: {
                  kind: 'sorting',
                  options: {
                    nameAsc: {
                      key: 'name',
                      order: 'ascending',
                    },
                    nameDesc: {
                      key: 'name',
                      order: 'descending',
                    },
                    lastModAsc: {
                      key: 'updatedAt',
                      order: 'ascending',
                    },
                    lastModDesc: {
                      key: 'updatedAt',
                      order: 'descending',
                    },
                  },
                },
              }}>
              <ListFilterModal
                searchInput={
                  <TextInputFilter
                    name="search"
                    label={t('projects.search_label')}
                    placeholder={t('projects.search.placeholder')}
                  />
                }>
                <SelectFilter
                  name="sort"
                  label={t('projects.sort_label')}
                  options={SORT_OPTIONS}
                  renderValue={renderSortOption}
                />
                <SelectFilter
                  name="role"
                  label={t('projects.role_filter_label')}
                  renderValue={renderRole}
                  options={PROJECT_ROLES}
                  unselectedLabel={t('general.filter.no_role')}
                  nullable={true}
                />
              </ListFilterModal>
              <ProjectList />
            </ListFilterProvider>
          )}
        </>
      </Column>
    </ScreenScaffold>
  );
};
