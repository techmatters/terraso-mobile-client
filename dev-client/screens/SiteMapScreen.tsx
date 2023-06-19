import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '.';
import {ScreenRoutes} from './constants';
import SiteMap from '../components/map/SiteMap';
import AppBar from '../components/AppBar';
import BottomNavigation from '../components/common/BottomNavigation';
import {Box, VStack} from 'native-base';

type Props = NativeStackScreenProps<RootStackParamList, ScreenRoutes.SITES_MAP>;

export default function SiteMapScreen({route}: Props) {
  return (
    <VStack>
      <Box flexBasis="90%">
        <SiteMap sites={route.params.sites} />
      </Box>
      <Box flexBasis="10%">
        <BottomNavigation />
      </Box>
    </VStack>
  );
}
