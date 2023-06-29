import {Button, Text, VStack} from 'native-base';
import {RootStackParamList, ScreenRoutes} from './constants';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useLoginDispatch} from '../context/LoginContext';

type Props = NativeStackScreenProps<RootStackParamList, ScreenRoutes.LOGIN>;

export default function LoginView(_: Props) {
  const dispatch = useLoginDispatch();

  return (
    <VStack alignItems="center" display="flex">
      <Button
        color="primary.main"
        size="md"
        onPress={() => {
          dispatch({type: 'login'});
        }}>
        Login with Google
      </Button>
      <Text>Why is this not rendered</Text>
    </VStack>
  );
}
