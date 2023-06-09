import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from './constants';

type Props = NativeStackScreenProps<
  RootStackParamList,
  ScreenRoutes.SITE_TRANSFER_PROJECT
>;

export default function TransferSiteProject({
  route: {
    params: {projectId},
  },
}: Props) {
  return <></>;
}
