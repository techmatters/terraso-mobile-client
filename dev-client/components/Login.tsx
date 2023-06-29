import {Button, VStack} from 'native-base';
import {useCallback} from 'react';
import {authorize} from 'react-native-app-auth';

import Config from 'react-native-config';
import {exchangeToken} from '../src/auth';
import {useLoginDispatch} from '../src/context/LoginContext';

// https://github.com/FormidableLabs/react-native-app-auth/blob/main/docs/config-examples/google.md
const googleConfig = {
  issuer: 'https://accounts.google.com',
  clientId: `${Config.GOOGLE_OAUTH_APP_GUID}.apps.googleusercontent.com`,
  redirectUrl: 'com.devclient:/oauth2redirect',
  scopes: ['openid', 'profile', 'email'],
};

export default function LoginView(): JSX.Element {
  const loginDispatch = useLoginDispatch();
  const onPress = useCallback(() => {
    authorize(googleConfig)
      .then(async result => {
        let {atoken, rtoken, email, firstName, lastName} = await exchangeToken(
          result.idToken,
          'google',
        );
        loginDispatch({type: 'login', name: firstName});
      })
      .catch(e => console.error(e));
  }, [googleConfig, authorize]);

  return (
    <Button bgColor="primary.main" size="lg" onPress={onPress}>
      Login with Google
    </Button>
  );
}
