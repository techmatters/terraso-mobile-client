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

import {useCallback, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Menu} from 'react-native-paper';

import {MaterialTopTabScreenProps} from '@react-navigation/material-top-tabs';
import type {CompositeScreenProps} from '@react-navigation/native';
import {createSelector} from '@reduxjs/toolkit';
import {Button, FlatList} from 'native-base';

import {
  Project,
  removeSiteFromAllProjects,
} from 'terraso-client-shared/project/projectSlice';
import {
  deleteSite,
  Site,
  updateSite,
} from 'terraso-client-shared/site/siteSlice';
import {normalizeText} from 'terraso-client-shared/utils';

import {IconButton} from 'terraso-mobile-client/components/icons/IconButton';
import {
  ListFilterModal,
  ListFilterProvider,
  RadioFilter,
  SortingOption,
  TextInputFilter,
  useListFilter,
} from 'terraso-mobile-client/components/ListFilter';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {
  Box,
  Column,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByProjectRole} from 'terraso-mobile-client/components/RestrictByRole';
import {SiteCard} from 'terraso-mobile-client/components/SiteCard';
import {useGeospatialContext} from 'terraso-mobile-client/context/GeospatialContext';
import {useProjectRoleContext} from 'terraso-mobile-client/context/ProjectRoleContext';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/navigation/constants';
import {RootStackScreenProps} from 'terraso-mobile-client/navigation/types';
import {AppState, useDispatch, useSelector} from 'terraso-mobile-client/store';
import {theme} from 'terraso-mobile-client/theme';
import {searchText} from 'terraso-mobile-client/util';

type SiteProps = {
  site: Site;
};

const SiteMenu = ({site}: SiteProps) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const [visible, setVisible] = useState(false);
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const deleteSiteCallback = async () => {
    await dispatch(deleteSite(site));
    dispatch(removeSiteFromAllProjects(site.id));
  };

  const removeSiteFromProjectCallback = async () => {
    const input = {id: site.id, projectId: null};
    return dispatch(updateSite(input));
  };

  return (
    <Menu
      contentStyle={{
        backgroundColor: theme.colors.background.default,
      }}
      visible={visible}
      onDismiss={closeMenu}
      anchor={
        <IconButton
          onPress={openMenu}
          _pressed={{backgroundColor: 'primary.lighter'}}
          name="more-vert"
        />
      }>
      <ConfirmModal
        trigger={onOpen => {
          return (
            <Menu.Item
              title={t('projects.sites.remove_site')}
              leadingIcon="minus"
              onPress={onOpen}
              titleStyle={MENU_ITEM_STYLE}
            />
          );
        }}
        title={t('projects.sites.remove_site_modal.title')}
        body={t('projects.sites.remove_site_modal.body', {
          siteName: site.name,
        })}
        actionName={t('projects.sites.remove_site_modal.action_name')}
        handleConfirm={removeSiteFromProjectCallback}
      />

      <ConfirmModal
        trigger={onOpen => (
          <Menu.Item
            title={t('projects.sites.delete_site')}
            leadingIcon="delete"
            onPress={onOpen}
            titleStyle={MENU_ITEM_STYLE}
          />
        )}
        title={t('projects.sites.delete_site_modal.title')}
        body={t('projects.sites.delete_site_modal.body', {
          siteName: site.name,
        })}
        actionName={t('projects.sites.delete_site_modal.action_name')}
        handleConfirm={deleteSiteCallback}
      />
    </Menu>
  );
};

const SiteCardList = ({showButtons}: {showButtons: boolean}) => {
  const {t} = useTranslation();
  const {filteredItems: sites} = useListFilter<Site>();

  return (
    <FlatList
      data={sites}
      renderItem={({item: site}) => (
        <SiteCard
          site={site}
          buttons={showButtons ? <SiteMenu site={site} /> : undefined}
        />
      )}
      keyExtractor={site => site.id}
      ItemSeparatorComponent={() => <Box h="8px" />}
      ListEmptyComponent={<Text>{t('site.search.no_matches')}</Text>}
    />
  );
};

type Props = CompositeScreenProps<
  MaterialTopTabScreenProps<TabStackParamList, TabRoutes.SITES>,
  RootStackScreenProps
>;

const selectProjectSites = createSelector(
  (state: AppState) => state.project.projects,
  (state: AppState) => state.site.sites,
  (_: AppState, projectId: string) => projectId,
  (
    projects: Record<string, Project>,
    sites: Record<string, Site>,
    projectId: string,
  ) => {
    let project = projects[projectId];
    return Object.keys(project?.sites)
      .map(id => sites[id])
      .filter(site => site);
  },
);

export function ProjectSitesScreen({
  route: {
    params: {projectId},
  },
  navigation,
}: Props): React.JSX.Element {
  const {t} = useTranslation();
  const transferCallback = useCallback(
    () =>
      navigation.navigate('SITE_TRANSFER_PROJECT', {
        projectId: String(projectId),
      }),
    [navigation, projectId],
  );

  const sites = useSelector(state => selectProjectSites(state, projectId));

  const sortNames = ['nameAsc', 'updatedAtAsc'];

  const {siteDistances} = useGeospatialContext();
  let distanceSorting: Record<string, SortingOption<Site>> | undefined;
  if (siteDistances !== null) {
    distanceSorting = {
      distanceAsc: {
        key: 'id',
        record: siteDistances,
        order: 'ascending',
      },
    };
    sortNames.push('distanceAsc');
  }

  const sortingOptions = Object.fromEntries(
    sortNames.map(label => [label, t('projects.sites.sort.' + label)]),
  );

  const isEmpty = sites.length === 0;

  const userRole = useProjectRoleContext();

  const showButtons = useMemo(() => userRole === 'MANAGER', [userRole]);

  const full = (
    <ListFilterProvider
      items={sites}
      filters={{
        search: {
          kind: 'filter',
          f: searchText,
          preprocess: normalizeText,
          lookup: {
            key: 'name',
          },
          hide: true,
        },
        sort: {
          kind: 'sorting',
          options: {
            nameAsc: {
              key: 'name',
              order: 'ascending',
            },
            updatedAtAsc: {
              key: 'name',
              order: 'ascending',
            },
            ...distanceSorting,
          },
        },
      }}>
      <ListFilterModal
        searchInput={
          <TextInputFilter
            name="search"
            placeholder={t('site.search.placeholder')}
            label={t('site.search.accessibility_label')}
          />
        }>
        <RadioFilter
          name="sort"
          label={t('projects.sites.sort.label')}
          options={sortingOptions}
        />
      </ListFilterModal>
      <SiteCardList showButtons={showButtons} />
    </ListFilterProvider>
  );

  return (
    <Column
      p={3}
      pb={5}
      space={3}
      h="100%"
      backgroundColor={theme.colors.background.tertiary}>
      {isEmpty && (
        <>
          <Text>{t('projects.sites.empty_viewer')}</Text>
          <RestrictByProjectRole role={['MANAGER', 'CONTRIBUTOR']}>
            <Text>{t('projects.sites.empty_contributor')}</Text>
          </RestrictByProjectRole>
        </>
      )}
      <RestrictByProjectRole role={['MANAGER', 'CONTRIBUTOR']}>
        <Button
          onPress={transferCallback}
          alignSelf="flex-start"
          _text={{textTransform: 'uppercase'}}>
          {t('projects.sites.transfer')}
        </Button>
      </RestrictByProjectRole>
      {!isEmpty && full}
    </Column>
  );
}

const MENU_ITEM_STYLE = {
  fontSize: 18,
};
