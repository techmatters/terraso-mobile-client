import {
  Box,
  FlatList,
  HStack,
  Heading,
  Link,
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
import {useCallback, useEffect} from 'react';
import {createSelector} from '@reduxjs/toolkit';
import ProgressCircle from '../common/ProgressCircle';
import {Icon, IconButton, MaterialCommunityIcons} from '../common/Icons';
import {RootStackScreenProps} from '../../screens/AppScaffold';
import {Site, deleteSite} from 'terraso-client-shared/site/siteSlice';
import {useDispatch, useSelector, AppState} from '../../model/store';
import {
  Project,
  removeSiteFromAllProjects,
} from 'terraso-client-shared/project/projectSlice';

type SiteMenuProps = {
  iconName: string;
  text: string;
  onPress?: () => void;
};

function SiteMenuItem({iconName, text, onPress}: SiteMenuProps) {
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
}

type SiteProps = {
  site: Site;
  deleteCallback: () => void;
};

function SiteItem({site, deleteCallback}: SiteProps) {
  const {t} = useTranslation();
  return (
    <Box backgroundColor="background.default" px={1} py={3} m={1}>
      <HStack>
        <Box mt={-0.5}>
          <Menu
            trigger={triggerProps => (
              <IconButton
                as={MaterialCommunityIcons}
                _icon={{size: 'md', color: 'action.active'}}
                name="dots-vertical"
                mr={-1}
                ml={-3}
                {...triggerProps}
              />
            )}>
            <SiteMenuItem
              iconName="remove"
              text={t('projects.sites.remove_site')}
            />
            <SiteMenuItem
              iconName="delete"
              onPress={deleteCallback}
              text={t('projects.sites.delete_site')}
            />
          </Menu>
        </Box>
        <VStack>
          <Heading>{site.name}</Heading>
          <Text color="primary.main">
            {t('general.modified_by', {
              date: 'TBD',
              user: 'TBD',
            })}
          </Text>
          <HStack alignItems="center" space={2}>
            <Icon size="4xl" name="photo" ml={-2} />
            <ProgressCircle done={0} />
            <Box flexGrow={1} flexDirection="row" justifyContent="flex-end">
              <Link _text={{color: 'primary.main'}}>
                {t('projects.sites.go_to')}
              </Link>
            </Box>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
}

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
    console.debug('project site length', Object.keys(project.siteIds));
    console.debug(Object.keys(sites));
    return Object.keys(project.siteIds).map(id => sites[id]);
  },
);

export default function ProjectSitesTab({
  route: {
    params: {projectId},
  },
  navigation,
}: Props): JSX.Element {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const transferCallback = useCallback(
    () =>
      navigation.navigate('SITE_TRANSFER_PROJECT', {
        projectId: String(projectId),
      }),
    [navigation, projectId],
  );

  const sites = useSelector(state => selectProjectSites(state, projectId));

  useEffect(() => {
    console.debug('project tab sites', sites.length);
  }, [sites]);

  const addSiteCallback = useCallback(() => {
    navigation.navigate('CREATE_SITE', {projectId: projectId});
  }, [navigation]);

  const deleteSiteCallback = (site: Site) => {
    return async () => {
      await dispatch(deleteSite(site));
      dispatch(removeSiteFromAllProjects(site.id));
    };
  };

  const isEmpty = sites.length === 0;

  const full = (
    <>
      <SearchBar selected={sites} />
      <FlatList
        data={sites}
        renderItem={({item}) => (
          <SiteItem site={item} deleteCallback={deleteSiteCallback(item)} />
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
