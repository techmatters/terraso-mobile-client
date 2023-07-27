import {Center} from 'native-base';
import Login from '../../components/Login';
import {ScreenDefinition, useNavigation} from './AppScaffold';
import {useSelector} from '../model/store';
import {useEffect} from 'react';

const LoginView = () => {
  const navigation = useNavigation();
  const loggedIn = useSelector(
    state => state.account.currentUser.data !== null,
  );

  // note: we intentionally run this on every render,
  // so we can't accidentally get stuck on this view because
  // it was navigated to while there is already user data
  useEffect(() => {
    if (loggedIn) {
      navigation.replace('HOME');
    }
  });

  return (
    <Center height="100%">
      <Login />
    </Center>
  );
};

export const LoginScreen: ScreenDefinition = {View: LoginView};
