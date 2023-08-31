import {useSelector} from '../../model/store';
import {Text} from 'native-base';
import {ScreenScaffold, AppBar} from '../../screens/ScreenScaffold';

type Props = {
  siteId: string;
};
export const SiteTeamSettingsScreen = ({siteId}: Props) => {
  const site = useSelector(state => state.site.sites[siteId]);
  return (
    <ScreenScaffold AppBar={<AppBar title={site.name} />}>
      <Text>Unimplemented team settings page</Text>
    </ScreenScaffold>
  );
};
