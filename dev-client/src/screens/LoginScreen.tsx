import {Center} from 'native-base';
import {RootStackParamList, ScreenRoutes} from './constants';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Login from '../../components/Login';

type Props = NativeStackScreenProps<RootStackParamList, ScreenRoutes.LOGIN>;

export default function LoginScreen(_: Props) {
  return (
    <Center height="100%">
      <Login />
    </Center>
  );
}
