import {
  Box,
  FlatList,
  HStack,
  Heading,
  Icon,
  Link,
  Menu,
  Text,
  ThreeDotsIcon,
  VStack,
} from 'native-base';
import AddButton from '../common/AddButton';
import {useTranslation} from 'react-i18next';
import {TabRoutes, TabStackParamList} from './constants';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import SearchBar from '../common/SearchBar';
import {SiteDisplay, SitePreview} from '../../types';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import React from 'react';
import ProgressCircle from '../common/ProgressCircle';
import MaterialCommunityIcon from '../common/MaterialCommunityIconButton';

type SiteMenuProps = {
  iconName: string;
  text: string;
};

function SiteMenuItem({iconName, text}: SiteMenuProps) {
  return (
    <Menu.Item>
      <HStack flexDirection="row" space={2} alignItems="center">
        <Icon as={MaterialIcons} name={iconName} size="xs" />
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
            trigger={(triggerProps): JSX.Element => {
              return (
                <MaterialCommunityIcon
                  iconProps={{size: 'md', color: 'action.active'}}
                  name="dots-vertical"
                  iconButtonProps={{...triggerProps, mr: -1, ml: -3}}
                />
              );
            }}>
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
            <Icon size="4xl" as={MaterialIcons} name="photo" ml={-2} />
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

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.SITES>;

export default function ProjectSitesTab({
  route: {
    params: {sites},
  },
}: Props) {
  const {t} = useTranslation();

  const empty = (
    <>
      <Text>{t('projects.sites.empty')}</Text>
      <Menu
        shouldOverlapWithTrigger={false}
        trigger={(props): JSX.Element => {
          return (
            <Box alignItems="flex-start">
              <AddButton text={t('projects.sites.add')} buttonProps={props} />
            </Box>
          );
        }}>
        <Menu.Item>{t('projects.sites.create') ?? ''}</Menu.Item>
        <Menu.Item>{t('projects.sites.transfer') ?? ''}</Menu.Item>
      </Menu>
    </>
  );

  const full = (
    <>
      <Box alignItems="flex-start">
        <AddButton text={t('projects.sites.add')} />
      </Box>
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
      {sites.length === 0 ? empty : full}
    </VStack>
  );
}
