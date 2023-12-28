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

import {
  Box,
  Button,
  FlatList,
  HStack,
  Menu,
  Pressable,
  Text,
  VStack,
} from 'native-base';
import {useTranslation} from 'react-i18next';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/navigation/constants';
import {MaterialTopTabScreenProps} from '@react-navigation/material-top-tabs';
import type {CompositeScreenProps} from '@react-navigation/native';
import {useCallback} from 'react';
import {createSelector} from '@reduxjs/toolkit';
import {
  Icon,
  MaterialCommunityIcons,
} from 'terraso-mobile-client/components/Icons';
import {RootStackScreenProps} from 'terraso-mobile-client/navigation/types';
import {
  Site,
  deleteSite,
  updateSite,
} from 'terraso-client-shared/site/siteSlice';
import {useDispatch, useSelector, AppState} from 'terraso-mobile-client/store';
import {
  Project,
  removeSiteFromAllProjects,
} from 'terraso-client-shared/project/projectSlice';
import {SiteCard} from 'terraso-mobile-client/components/SiteCard';
import {CardTopRightButton} from 'terraso-mobile-client/components/CardTopRightButton';
import {ConfirmModal} from 'terraso-mobile-client/components/ConfirmModal';
import {
  ListFilterModal,
  ListFilterProvider,
  RadioFilter,
  SortingOption,
  TextInputFilter,
  useListFilter,
} from 'terraso-mobile-client/components/ListFilter';
import {useGeospatialContext} from 'terraso-mobile-client/context/GeospatialContext';
import {searchText} from 'terraso-mobile-client/util';
import {normalizeText} from 'terraso-client-shared/utils';

type SiteMenuProps = {
  iconName: string;
  text: string;
  onPress?: () => void;
};

const SiteMenuItem = ({iconName, text, onPress}: SiteMenuProps) => {
  return (
    <Menu.Item>
      <Pressable onPress={onPress}>
        <HStack flexDirection="row" space={2} alignItems="center">
          <Icon name={iconName} size="xs" />
          <Text>{text}</Text>
        </HStack>
      </Pressable>
    </Menu.Item>
  );
};

type SiteProps = {
  site: Site;
};

const SiteMenu = ({site}: SiteProps) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();

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
      closeOnSelect={true}
      trigger={triggerProps => (
        <CardTopRightButton
          as={MaterialCommunityIcons}
          // _icon={{size: 'md', color: 'action.active'}}
          name="dots-vertical"
          {...triggerProps}
        />
      )}>
      <ConfirmModal
        trigger={onOpen => (
          <SiteMenuItem
            iconName="remove"
            text={t('projects.sites.remove_site')}
            onPress={onOpen}
          />
        )}
        title={t('projects.sites.remove_site_modal.title')}
        body={t('projects.sites.remove_site_modal.body', {siteName: site.name})}
        actionName={t('projects.sites.remove_site_modal.action_name')}
        handleConfirm={removeSiteFromProjectCallback}
      />

      <ConfirmModal
        trigger={onOpen => (
          <SiteMenuItem
            iconName="delete"
            onPress={onOpen}
            text={t('projects.sites.delete_site')}
          />
        )}
        title={t('projects.sites.delete_site_modal.title')}
        body={t('projects.sites.delete_site_modal.body', {siteName: site.name})}
        actionName={t('projects.sites.delete_site_modal.action_name')}
        handleConfirm={deleteSiteCallback}
      />
    </Menu>
  );
};

const SiteCardList = () => {
  const {t} = useTranslation();
  const {filteredItems: sites} = useListFilter<Site>();

  return (
    <FlatList
      data={sites}
      renderItem={({item: site}) => (
        <SiteCard site={site} buttons={<SiteMenu site={site} />} />
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
    return Object.keys(project.sites)
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
      <SiteCardList />
    </ListFilterProvider>
  );

  return (
    <VStack m={3} pb={5} space={3} h="100%">
      {isEmpty && <Text>{t('projects.sites.empty')}</Text>}
      <Button
        onPress={transferCallback}
        alignSelf="flex-start"
        _text={{textTransform: 'uppercase'}}>
        {t('projects.sites.transfer') ?? ''}
      </Button>
      {!isEmpty && full}
    </VStack>
  );
}
