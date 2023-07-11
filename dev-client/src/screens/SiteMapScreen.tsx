import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '.';
import {ScreenRoutes} from './constants';
import SiteMap from '../components/map/SiteMap';
import BottomNavigation from '../components/common/BottomNavigation';
import {Box, VStack} from 'native-base';
import {useCallback} from 'react';
import {Location} from '@rnmapbox/maps';
import {updateLocation} from '../model/map/mapSlice';
import {useDispatch} from '../model/store';
import {useSelector} from '../model/store';
// import {useFetchData} from 'terraso-client-shared/store/utils';
// import {fetchSitesForUser} from 'terraso-client-shared/site/siteSlice';

type Props = NativeStackScreenProps<RootStackParamList, ScreenRoutes.SITES_MAP>;

export default function SiteMapScreen(_: Props) {
  const sitesMap = useSelector(state => state.site.sites);
  const dispatch = useDispatch();

  const updateUserLocation = useCallback(
    (location: Location) => {
      dispatch(updateLocation(location));
    },
    [dispatch],
  );
  return (
    <VStack>
      <Box flexBasis="90%">
        <SiteMap updateUserLocation={updateUserLocation} sites={sitesMap} />
      </Box>
      <Box flexBasis="10%">
        <BottomNavigation />
      </Box>
    </VStack>
  );
}
