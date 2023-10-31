import {
  Box,
  FlatList,
  HStack,
  Menu,
  Pressable,
  Text,
  VStack,
} from 'native-base';
import AddButton from 'terraso-mobile-client/components/common/AddButton';
import {useTranslation} from 'react-i18next';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/components/projects/constants';
import {MaterialTopTabScreenProps} from '@react-navigation/material-top-tabs';
import type {CompositeScreenProps} from '@react-navigation/native';
import {SearchBar} from 'terraso-mobile-client/components/common/search/SearchBar';
import {useCallback} from 'react';
import {createSelector} from '@reduxjs/toolkit';
import {
  Icon,
  MaterialCommunityIcons,
} from 'terraso-mobile-client/components/common/Icons';
import {RootStackScreenProps} from 'terraso-mobile-client/screens/AppScaffold';
import {
  Site,
  deleteSite,
  updateSite,
} from 'terraso-client-shared/site/siteSlice';
import {
  useDispatch,
  useSelector,
  AppState,
} from 'terraso-mobile-client/model/store';
import {
  Project,
  removeSiteFromAllProjects,
} from 'terraso-client-shared/project/projectSlice';
import {SiteCard} from 'terraso-mobile-client/components/sites/SiteCard';
import {useTextSearch} from 'terraso-mobile-client/components/common/search/search';
import {CardTopRightButton} from 'terraso-mobile-client/components/common/Card';
import ConfirmModal from 'terraso-mobile-client/components/common/ConfirmModal';

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

export default function ProjectSitesTab({
  route: {
    params: {projectId},
  },
  navigation,
}: Props): JSX.Element {
  const {t} = useTranslation();
  const transferCallback = useCallback(
    () =>
      navigation.navigate('SITE_TRANSFER_PROJECT', {
        projectId: String(projectId),
      }),
    [navigation, projectId],
  );

  const sites = useSelector(state => selectProjectSites(state, projectId));
  const {
    results: searchedSites,
    query,
    setQuery,
  } = useTextSearch({
    data: sites,
    keys: ['name'],
  });

  const addSiteCallback = useCallback(() => {
    navigation.navigate('CREATE_SITE', {projectId: projectId});
  }, [navigation, projectId]);

  const isEmpty = sites.length === 0;

  const full = (
    <>
      <SearchBar
        mb="18px"
        query={query}
        setQuery={setQuery}
        placeholder={t('site.search.placeholder')}
        FilterOptions={<Text>Site filter placeholder</Text>}
        filterIcon="sort"
      />
      <FlatList
        data={searchedSites}
        renderItem={({item: site}) => (
          <SiteCard site={site} buttons={<SiteMenu site={site} />} />
        )}
        keyExtractor={site => site.id}
        ItemSeparatorComponent={() => <Box h="8px" />}
        ListEmptyComponent={<Text>{t('site.search.no_matches')}</Text>}
      />
    </>
  );

  return (
    <VStack m={3} pb={5} space={3} h="100%">
      {isEmpty && <Text>{t('projects.sites.empty')}</Text>}
      <Menu
        shouldOverlapWithTrigger={false}
        trigger={(props): JSX.Element => {
          return (
            <Box alignItems="flex-start">
              <AddButton text={t('projects.sites.add')} buttonProps={props} />
            </Box>
          );
        }}>
        <Menu.Item onPress={addSiteCallback}>
          {t('projects.sites.create') ?? ''}
        </Menu.Item>
        <Menu.Item onPress={transferCallback}>
          {t('projects.sites.transfer') ?? ''}
        </Menu.Item>
      </Menu>
      {!isEmpty && full}
    </VStack>
  );
}
