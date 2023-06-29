import {Button, Center, Text, VStack} from 'native-base';
import {RootStackParamList, ScreenRoutes} from './constants';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useLoginDispatch} from '../context/LoginContext';
import Login from '../../components/Login';

type Props = NativeStackScreenProps<RootStackParamList, ScreenRoutes.LOGIN>;

export default function LoginView(_: Props) {
  return (
    <Center height="100%">
      <Login />
    </Center>
  );
}
