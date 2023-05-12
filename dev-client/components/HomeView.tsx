import {VStack} from 'native-base';
import AppBar from './AppBar';
import SiteMap, {type SiteMapProps} from './SiteMap';

export default function HomeView(props: SiteMapProps) {
  return (
    <>
      <AppBar />
      <SiteMap {...props} />
    </>
  );
}
