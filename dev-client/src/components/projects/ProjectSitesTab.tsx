import {
  Box,
  FlatList,
  HStack,
  Menu,
  Pressable,
  Text,
  VStack,
} from 'native-base';
import AddButton from '../common/AddButton';
import {useTranslation} from 'react-i18next';
import {TabRoutes, TabStackParamList} from './constants';
import {MaterialTopTabScreenProps} from '@react-navigation/material-top-tabs';
import type {CompositeScreenProps} from '@react-navigation/native';
import SearchBar from '../common/SearchBar';
import {useCallback} from 'react';
import {createSelector} from '@reduxjs/toolkit';
import {Icon, IconButton, MaterialCommunityIcons} from '../common/Icons';
import {RootStackScreenProps} from '../../screens/AppScaffold';
import {Site, deleteSite} from 'terraso-client-shared/site/siteSlice';
import {useDispatch, useSelector, AppState} from '../../model/store';
import {
  Project,
  removeSiteFromAllProjects,
} from 'terraso-client-shared/project/projectSlice';
import {SiteCard} from '../sites/SiteCard';

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

  return (
    <Menu
      trigger={triggerProps => (
        <IconButton
          as={MaterialCommunityIcons}
          // _icon={{size: 'md', color: 'action.active'}}
          name="dots-vertical"
          {...triggerProps}
        />
      )}>
      <SiteMenuItem iconName="remove" text={t('projects.sites.remove_site')} />
      <SiteMenuItem
        iconName="delete"
        onPress={deleteSiteCallback}
        text={t('projects.sites.delete_site')}
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
    return Object.keys(project.siteIds)
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

  const addSiteCallback = useCallback(() => {
    navigation.navigate('CREATE_SITE', {projectId: projectId});
  }, [navigation, projectId]);

  const isEmpty = sites.length === 0;

  const full = (
    <>
      <SearchBar selected={sites} />
      <FlatList
        data={sites}
        renderItem={({item: site}) => (
          <SiteCard site={site} topRightButton={<SiteMenu site={site} />} />
        )}
        keyExtractor={site => site.id}
      />
    </>
  );

  return (
    <VStack m={3} pb={5} space={3} height="100%">
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
