import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '.';
import {ScreenRoutes} from './constants';
import SiteMap from '../components/map/SiteMap';
import BottomNavigation from '../components/common/BottomNavigation';
import {Box, VStack} from 'native-base';
// import {useFetchData} from 'terraso-client-shared/store/utils';
// import {fetchSitesForUser} from 'terraso-client-shared/site/siteSlice';

type Props = NativeStackScreenProps<RootStackParamList, ScreenRoutes.SITES_MAP>;

export default function SiteMapScreen(_: Props) {
  // useFetchData(fetchSitesForUser);

  return (
    <VStack>
      <Box flexBasis="90%">
        <SiteMap />
      </Box>
      <Box flexBasis="10%">
        <BottomNavigation />
      </Box>
    </VStack>
  );
}
