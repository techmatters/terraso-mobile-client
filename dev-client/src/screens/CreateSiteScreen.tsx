import CreateSiteView from '../components/sites/CreateSiteView';
import {useSelector} from '../model/store';
// import {ScreenRoutes, TopLevelScreenProps} from './constants';

// type Props = TopLevelScreenProps<ScreenRoutes.CREATE_SITE>;

export default function CreateSiteScreen() {
  const userLocation = useSelector(state => state.map.userLocation);
  return <CreateSiteView projects={[]} userLocation={userLocation} />;
}
