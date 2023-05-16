import {VStack} from 'native-base';
import AppBar from './AppBar';
import SiteMap, {type SiteMapProps} from './SiteMap';
import BottomNavigation from './BottomNavigation';

export default function HomeView(props: SiteMapProps) {
  return (
    <VStack style={{flex: 1}}>
      <AppBar />
      <SiteMap {...props} style={{flex: 2}} />
      <BottomNavigation />
    </VStack>
  );
}
