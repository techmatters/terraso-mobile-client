import BottomSheet, {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import {useNavigation} from '@react-navigation/native';
import {Box, Button, Flex, Heading, Text} from 'native-base';
import {useCallback, useMemo} from 'react';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {ScreenRoutes} from '../../screens/constants';
import {TopLevelNavigationProp} from '../../screens';
import {useSelector} from '../../model/store';

type Props = {
  sites: Record<string, Site>;
  showSiteOnMap: (site: Site) => void;
};
const SiteListBottomSheet = ({sites, showSiteOnMap}: Props) => {
  const navigation = useNavigation<TopLevelNavigationProp>();

  const siteList = useMemo(() => Object.values(sites), [sites]);
  const projects = useSelector(state => state.project.sites);

  const renderSite = useCallback(
    ({item: site}: {item: Site}) => (
      <Box bg="grey.200" padding="4">
        <Heading size="lg">{site.name}</Heading>
        {site.projectId && (
          <Heading size="md">{projects[site.projectId].name}</Heading>
        )}
        <Flex direction="row" align="top">
          <Box height="100px" width="100px" bg="background.default" />
          <Box width="4" />
          <Box flexGrow="1">
            <Text>Last Updated: dd-mm-yy</Text>
            <Text>Progress: ??</Text>
            <Flex
              direction="row"
              align="center"
              padding="2"
              justify="space-between">
              <Text>x Members</Text>
              <Button variant="ghost" onPress={() => showSiteOnMap(site)}>
                SHOW ON MAP
              </Button>
            </Flex>
          </Box>
        </Flex>
      </Box>
    ),
    [showSiteOnMap, projects],
  );

  const snapPoints = useMemo(
    () => ['15%', siteList.length === 0 ? '50%' : '75%', '100%'],
    [siteList.length],
  );

  const addSiteCallback = useCallback(() => {
    navigation.navigate(ScreenRoutes.CREATE_SITE);
  }, [navigation]);

  return (
    <BottomSheet snapPoints={snapPoints}>
      <Box padding="4">
        <Flex
          direction="row"
          justify="space-between"
          align="center"
          paddingBottom="4">
          <Heading size="xl">Sites</Heading>
          <Button size="lg" onPress={addSiteCallback}>
            CREATE SITE
          </Button>
        </Flex>
        {siteList.length === 0 && (
          <>
            <Text fontSize="md">
              You don’t currently have any saved sites. Create a site by using
              the button above or by finding the site location on the map.
            </Text>
            <Text />
            <Text fontSize="md">
              A site allows you to collect data, learn more about your land, and
              share with others. Learn more about using LandPKS...
            </Text>
          </>
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
