import {Box} from 'native-base';
import {ScreenDefinition} from './AppScaffold';
import {useSelector} from '../model/store';
import {HeaderTitle} from '@react-navigation/elements';
import CloseButton from '../components/common/CloseButton';

type Props = {siteId: string};

export const SiteDashboardScreen: ScreenDefinition<Props> = {
  View: _ => <Box />,
  options: () => ({
    headerBackVisible: false,
    headerLeft: CloseButton,
    HeaderTitle: ({siteId, ...props}) => {
      const name = useSelector(state => state.site.sites[siteId].name);
      return <HeaderTitle {...props}>{name}</HeaderTitle>;
    },
  }),
};
