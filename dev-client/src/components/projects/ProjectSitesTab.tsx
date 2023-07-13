import {
  Box,
  FlatList,
  HStack,
  Heading,
  Link,
  Menu,
  Text,
  VStack,
} from 'native-base';
import AddButton from '../common/AddButton';
import {useTranslation} from 'react-i18next';
import {TabRoutes, TabStackParamList} from './constants';
import {MaterialTopTabScreenProps} from '@react-navigation/material-top-tabs';
import type {CompositeScreenProps} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import SearchBar from '../common/SearchBar';
import {SitePreview} from '../../types';
import {useCallback} from 'react';
import ProgressCircle from '../common/ProgressCircle';
import {ScreenRoutes} from '../../screens/constants';
import {RootStackParamList} from '../../screens';
import {Icon, IconButton, MaterialCommunityIcons} from '../common/Icons';

type SiteMenuProps = {
  iconName: string;
  text: string;
};

function SiteMenuItem({iconName, text}: SiteMenuProps) {
  return (
    <Menu.Item>
      <HStack flexDirection="row" space={2} alignItems="center">
        <Icon name={iconName} size="xs" />
        <Text>{text}</Text>
      </HStack>
    </Menu.Item>
  );
}

type SiteProps = {
  site: SitePreview;
};

function SiteItem({site}: SiteProps) {
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
              iconName="list-alt"
              text={t('projects.sites.audit_log')}
            />
            <SiteMenuItem
              iconName="remove"
              text={t('projects.sites.remove_site')}
            />
            <SiteMenuItem
              iconName="delete"
              text={t('projects.sites.delete_site')}
            />
          </Menu>
        </Box>
        <VStack>
          <Heading>{site.name}</Heading>
          <Text color="primary.main">
            {t('general.modified_by', {
              date: new Date(site.lastModified.date).toLocaleDateString(),
              user: site.lastModified.user.name,
            })}
          </Text>
          <HStack alignItems="center" space={2}>
            <Icon size="4xl" name="photo" ml={-2} />
            <ProgressCircle done={site.percentComplete} />
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
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProjectSitesTab({
  route: {
    params: {projectId, sites},
  },
  navigation,
}: Props): JSX.Element {
  const {t} = useTranslation();
  const transferCallback = useCallback(
    () => navigation.navigate(ScreenRoutes.SITE_TRANSFER_PROJECT, {projectId}),
    [navigation, projectId],
  );
  const addSiteCallback = useCallback(() => {
    navigation.navigate(ScreenRoutes.CREATE_SITE);
  }, [navigation]);

  const isEmpty = sites.length === 0;

  const full = (
    <>
      <SearchBar selected={sites} />
      <FlatList
        data={sites}
        renderItem={({item}) => <SiteItem site={item} />}
        keyExtractor={site => String(site.id)}
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
