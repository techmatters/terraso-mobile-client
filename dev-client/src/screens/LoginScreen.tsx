import {Button, Center, Text, VStack} from 'native-base';
import {RootStackParamList, ScreenRoutes} from './constants';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useLoginDispatch} from '../context/LoginContext';
import Login from '../../components/Login';

type Props = NativeStackScreenProps<RootStackParamList, ScreenRoutes.LOGIN>;

export default function LoginView(_: Props) {
  const dispatch = useLoginDispatch();

  return (
    <Center>
      <Login />
    </Center>
  );
}
