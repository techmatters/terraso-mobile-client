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
import {useTranslation} from 'react-i18next';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {Box, Heading, Link, Text, VStack, Spinner} from 'native-base';
import {IconButton} from 'terraso-mobile-client/components/Icons';
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
import {RootNavigatorScreens} from 'terraso-mobile-client/navigation/types';

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
    () => navigation.navigate(RootNavigatorScreens.CREATE_PROJECT),
    [navigation],
  );
  const isLoadingData = useSelector(state => state.soilId.status === 'loading');
  const SORT_OPTIONS = Object.fromEntries(
    ['nameAsc', 'nameDesc'].map(name => [name, t(`projects.search.${name}`)]),
  );

  return (
    <VStack
      bg="grey.200"
      p={5}
      flexGrow={1}
      flexShrink={0}
      flexBasis="70%"
      space="10px">
      <Box alignItems="flex-start" pb={3}>
        <AddButton text={t('projects.create_button')} buttonProps={{onPress}} />
      </Box>

      {isLoadingData ? (
        <Spinner size="lg" />
      ) : (
        activeProjects.length === 0 && (
          <>
            <Heading size="sm">{t('projects.none.header')}</Heading>
            <Text>{t('projects.none.info')}</Text>
            <Link _text={{color: 'primary.main'}} alignItems="center" mb="4">
              <IconButton name="open-in-new" _icon={{color: 'action.active'}} />
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
              nullableOption={t('general.filter.no_sort')}
            />
            <SelectFilter
              name="role"
              label={t('projects.role_filter_label')}
              placeholder=""
              options={{
                manager: t('general.role.manager'),
                contributor: t('general.role.contributor'),
                viewer: t('general.role.viewer'),
              }}
              nullableOption={t('general.filter.no_role')}
            />
          </ListFilterModal>
          <ProjectList />
        </ListFilterProvider>
      )}
    </VStack>
  );
};
