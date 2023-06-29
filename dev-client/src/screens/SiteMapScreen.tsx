import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '.';
import {ScreenRoutes} from './constants';
import SiteMap, {SiteMarker} from '../components/map/SiteMap';
import BottomNavigation from '../components/common/BottomNavigation';
import {Box, VStack} from 'native-base';

type Props = NativeStackScreenProps<RootStackParamList, ScreenRoutes.SITES_MAP>;

export default function SiteMapScreen({route}: Props) {
  const siteMarkers = route.params.sites.map<SiteMarker>(site => ({
    id: site.id.toString(),
    coordinates: [site.lon, site.lat],
  }));
  return (
    <VStack>
      <Box flexBasis="90%">
        <SiteMap sites={siteMarkers} />
      </Box>
      <Box flexBasis="10%">
        <BottomNavigation />
      </Box>
    </VStack>
  );
}
