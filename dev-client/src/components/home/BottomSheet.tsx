import BottomSheet, {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import {useNavigation} from '../../screens/AppScaffold';
import {Box, Button, Flex, Heading, Text, Badge} from 'native-base';
import {useCallback, useMemo} from 'react';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {useSelector} from '../../model/store';
import {useTranslation} from 'react-i18next';
import {Pressable} from 'react-native';

type SiteListSiteProps = {
  site: Site;
  showSiteOnMap: (site: Site) => void;
};
const SiteListSite = ({site, showSiteOnMap}: SiteListSiteProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const project = useSelector(state =>
    site.projectId === undefined
      ? undefined
      : state.project.projects[site.projectId],
  );

  const onTitlePress = useCallback(
    () => navigation.navigate('SITE_DASHBOARD', {siteId: site.id}),
    [navigation, site.id],
  );

  return (
    <Box bg="grey.200" padding="4">
      <Pressable onPress={onTitlePress}>
        <Heading size="lg">{site.name}</Heading>
      </Pressable>
      {project && <Heading size="md">{project.name}</Heading>}
      <Flex direction="row" align="top">
        <Box height="100px" width="100px" bg="background.default" />
        <Box width="4" />
        <Box flexGrow="1">
          <Text>
            {t('site.last_updated', {
              date: 'dd-mm-yyyy',
            })}
          </Text>
          <Text>{t('site.progress', {progress: '??'})}</Text>
          <Flex
            direction="row"
            align="center"
            padding="2"
            justify="space-between">
            <Badge>{t('site.members', {members: 'x'})}</Badge>
            <Button variant="ghost" onPress={() => showSiteOnMap(site)}>
              {t('site.show_on_map')}
            </Button>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};

type Props = {
  sites: Record<string, Site>;
  showSiteOnMap: (site: Site) => void;
};
const SiteListBottomSheet = ({sites, showSiteOnMap}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const siteList = useMemo(() => Object.values(sites), [sites]);

  const renderSite = useCallback(
    ({item}: {item: Site}) => (
      <SiteListSite site={item} showSiteOnMap={showSiteOnMap} />
    ),
    [showSiteOnMap],
  );

  const snapPoints = useMemo(
    () => ['15%', siteList.length === 0 ? '50%' : '75%', '100%'],
    [siteList.length],
  );

  const addSiteCallback = useCallback(() => {
    navigation.navigate('CREATE_SITE');
  }, [navigation]);

  return (
    <BottomSheet snapPoints={snapPoints}>
      <Box padding="4">
        <Flex
          direction="row"
          justify="space-between"
          align="center"
          paddingBottom="4">
          <Heading size="xl">{t('site.list_title')}</Heading>
          <Button size="lg" onPress={addSiteCallback}>
            {t('site.create')}
          </Button>
        </Flex>
        {siteList.length === 0 && (
          <Text fontSize="md">{t('site.none_in_list')}</Text>
        )}
      </Box>
      <BottomSheetFlatList
        data={siteList}
        keyExtractor={site => site.id}
        renderItem={renderSite}
      />
    </BottomSheet>
  );
};

export default SiteListBottomSheet;
