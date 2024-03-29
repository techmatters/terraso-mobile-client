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
import {useSelector} from 'terraso-mobile-client/store';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {AppBarIconButton} from 'terraso-mobile-client/navigation/components/AppBarIconButton';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useTranslation} from 'react-i18next';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {Link, Spinner} from 'native-base';
import {AddButton} from 'terraso-mobile-client/components/AddButton';
import {
  ListFilterModal,
  ListFilterProvider,
  SelectFilter,
  TextInputFilter,
} from 'terraso-mobile-client/components/ListFilter';
import {selectProjectUserRolesMap} from 'terraso-client-shared/selectors';
import {normalizeText} from 'terraso-client-shared/utils';
import {equals, searchText} from 'terraso-mobile-client/util';
import {ProjectList} from 'terraso-mobile-client/screens/ProjectListScreen/components/ProjectList';
import {
  Box,
  VStack,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {PROJECT_ROLES} from 'terraso-client-shared/project/projectSlice';

const SORT_OPTIONS = ['nameAsc', 'nameDesc'];

export const ProjectListScreen = () => {
  const allProjects = useSelector(state => state.project.projects);
  const activeProjects = useMemo(
    () => Object.values(allProjects).filter(project => !project.archived),
    [allProjects],
  );
  const projectRoleLookup = useSelector(state =>
    selectProjectUserRolesMap(state),
  );

  const {t} = useTranslation();
  const navigation = useNavigation();
  const onPress = useCallback(
    () => navigation.navigate('CREATE_PROJECT'),
    [navigation],
  );
  const isLoadingData = useSelector(state => state.soilId.status === 'loading');
  const renderSortOption = useCallback(
    (option: string) => t(`projects.search.${option}`),
    [t],
  );

  const renderRole = useCallback(
    (role: string) => t(`general.role.${role}`),
    [t],
  );

  return (
    <ScreenScaffold
      AppBar={
        <AppBar
          LeftButton={<AppBarIconButton name="menu" />}
          RightButton={<AppBarIconButton name="help" />}
        />
      }>
      <VStack
        bg="grey.200"
        p={5}
        flexGrow={1}
        flexShrink={0}
        flexBasis="70%"
        space="10px">
        <Box alignItems="flex-start" pb={3}>
          <AddButton
            text={t('projects.create_button')}
            buttonProps={{onPress}}
          />
        </Box>

        {isLoadingData ? (
          <Spinner size="lg" />
        ) : (
          activeProjects.length === 0 && (
            <>
              <Text variant="body1-strong">{t('projects.none.header')}</Text>
              <Text>{t('projects.none.info')}</Text>
              <Link _text={{color: 'primary.main'}} alignItems="center" mb="4">
                {t('projects.learn_more')}
              </Link>
            </>
          )
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
                },
              },
            }}>
            <ListFilterModal
              searchInput={
                <TextInputFilter
                  name="search"
                  label={t('projects.search_label')}
                  placeholder={t('projects.search_placeholder')}
                />
              }>
              <SelectFilter
                name="sort"
                label={t('projects.sort_label')}
                options={SORT_OPTIONS}
                renderValue={renderSortOption}
                unselectedLabel={t('general.filter.no_sort')}
              />
              <SelectFilter
                name="role"
                label={t('projects.role_filter_label')}
                renderValue={renderRole}
                options={PROJECT_ROLES}
                unselectedLabel={t('general.filter.no_role')}
              />
            </ListFilterModal>
            <ProjectList />
          </ListFilterProvider>
        )}
      </VStack>
    </ScreenScaffold>
  );
};
