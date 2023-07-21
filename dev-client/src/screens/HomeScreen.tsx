import SiteMap from '../components/home/SiteMap';
import BottomNavigation from '../components/common/BottomNavigation';
import {Box, VStack} from 'native-base';
import {useCallback, useEffect, useState} from 'react';
import {Location} from '@rnmapbox/maps';
import {updateLocation} from '../model/map/mapSlice';
import {useDispatch} from '../model/store';
import {useSelector} from '../model/store';
import {fetchSitesForUser} from 'terraso-client-shared/site/siteSlice';
import BottomSheet from '../components/home/BottomSheet';
import {ScreenDefinition} from './AppScaffold';
import {MainMenuBar, MapInfoIcon} from './HeaderIcons';
import {type Position} from '@rnmapbox/maps/lib/typescript/types/Position';

const HomeView = () => {
  const [mapCenter, setMapCenter] = useState<Position | undefined>(undefined);
  const sites = useSelector(state => state.site.sites);
  const dispatch = useDispatch();

  useEffect(() => {
    // load sites on mount
    dispatch(fetchSitesForUser());
  }, [dispatch]);

  const updateUserLocation = useCallback(
    (location: Location) => {
      dispatch(updateLocation(location));
    },
    [dispatch],
  );
  return (
    <VStack>
      <Box flexBasis="90%">
        <SiteMap
          updateUserLocation={updateUserLocation}
          sites={sites}
          center={mapCenter}
        />
        <BottomSheet
          sites={sites}
          showSiteOnMap={site => setMapCenter([site.longitude, site.latitude])}
        />
      </Box>
      <Box flexBasis="10%">
        <BottomNavigation />
      </Box>
    </VStack>
  );
};

export const HomeScreen: ScreenDefinition = {
  View: HomeView,
  options: () => ({
    headerLeft: MainMenuBar,
    headerRight: MapInfoIcon,
  }),
};
