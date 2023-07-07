import CreateSiteView from '../components/sites/CreateSiteView';
import {TopLevelScreenProps} from './constants';
import {ScreenRoutes} from './constants';

type Props = TopLevelScreenProps<ScreenRoutes.CREATE_SITE>;

export default function CreateSiteScreen(props: Props) {
  return <CreateSiteView />;
}
