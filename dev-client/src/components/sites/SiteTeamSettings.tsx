import {HeaderTitle} from '@react-navigation/elements';
import {useSelector} from '../../model/store';
import {ScreenDefinition} from '../../screens/AppScaffold';
import {Text} from 'native-base';

type Props = {
  siteId: string;
};
export const SiteTeamSettingsScreen: ScreenDefinition<Props> = {
  View: () => <Text>Unimplemented team settings page</Text>,
  options: ({siteId}) => ({
    /* eslint-disable react-hooks/rules-of-hooks */
    headerTitle: props => {
      const name = useSelector(state => state.site.sites[siteId].name);
      return <HeaderTitle {...props}>{name}</HeaderTitle>;
    },
  }),
};
