import {Text} from 'native-base';
import {useSelector} from 'terraso-mobile-client/store';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';

type Props = {
  siteId: string;
};

export const SlopeSteepnessScreen = ({siteId}: Props) => {
  const name = useSelector(state => state.site.sites[siteId].name);
  return (
    <ScreenScaffold AppBar={<AppBar title={name} />} BottomNavigation={null}>
      <Text>Unimplemented steepness screen</Text>
    </ScreenScaffold>
  );
};
