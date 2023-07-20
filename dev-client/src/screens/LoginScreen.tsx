import {Center} from 'native-base';
import Login from '../../components/Login';
import {ScreenDefinition} from './AppScaffold';

// export const LoginScreen = (props: ScreenProps) => ScreenScaffold(props);

const LoginView = () => (
  <Center height="100%">
    <Login />
  </Center>
);

export const LoginScreen: ScreenDefinition = {View: LoginView};
