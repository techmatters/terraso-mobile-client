import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import {useNavigation} from '../../screens/AppScaffold';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Badge,
  VStack,
  Link,
  Image,
} from 'native-base';
import {useCallback, useMemo} from 'react';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {useSelector} from '../../model/store';
import {Trans, useTranslation} from 'react-i18next';
import {Pressable} from 'react-native';
import {Icon} from '../common/Icons';

const LandPKSInfo = () => {
  const {t} = useTranslation();

  return (
    <BottomSheetScrollView>
      <VStack space={3} pb="60%" px={5}>
        <Heading>{t('site.empty.title')}</Heading>
        <Image
          source={require('../../assets/landpks_intro_image.png')}
          width="100%"
          height="30%"
          resizeMode="contain"
          alt={t('site.empty.intro_image_alt')}
        />
        <Text>
          <Text bold>{t('site.empty.description.lead')} </Text>
          {t('site.empty.description.body')}
        </Text>
        <Text alignItems="center">
          <Text bold>{t('site.empty.location.lead')} </Text>
          <Trans
            i18nKey="site.empty.location.body"
            components={{
              icon: (
                <Icon
                  name="my-location"
                  color="action.active"
                  position="relative"
                />
              ),
            }}
          />
        </Text>
        <Text>
          <Text bold>{t('site.empty.search.lead')} </Text>
          {t('site.empty.search.body')}
        </Text>
        <Text>
          <Text bold>{t('site.empty.learn_more.lead')} </Text>
          <Trans
            i18nKey="site.empty.learn_more.body"
            components={{
              // note: "link" is a reserved word for the Trans component, cannot use as key here
              // see https://react.i18next.com/latest/trans-component#alternative-usage-which-lists-the-components-v11.6.0
              landpks: (
                <Link
                  _text={{
                    color: 'primary.main',
                    fontSize: 'sm',
                  }}
                  isExternal
                  pt={2}
                />
              ),
            }}
          />
        </Text>
      </VStack>
    </BottomSheetScrollView>
  );
};

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
    () => navigation.navigate('LOCATION_DASHBOARD', {siteId: site.id}),
    [navigation, site.id],
  );

  return (
    <Box bg="grey.200" padding="4">
      <Pressable onPress={onTitlePress}>
        <Heading size="lg">{site.name}</Heading>
      </Pressable>
      {project && <Heading size="md">{project.name}</Heading>}
      <Flex direction="row" align="start">
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
      </Box>
      {siteList.length === 0 ? (
        <LandPKSInfo />
      ) : (
        <BottomSheetFlatList
          data={siteList}
          keyExtractor={site => site.id}
          renderItem={renderSite}
        />
      )}
    </BottomSheet>
  );
};

export default SiteListBottomSheet;
