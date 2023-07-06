import {Button} from 'native-base';
import {useCallback} from 'react';
import {authorize} from 'react-native-app-auth';

import Config from 'react-native-config';
import {exchangeToken} from '../src/auth';
import {setHasAccessTokenAsync} from 'terraso-client-shared/account/accountSlice';
import {useDispatch} from '../model/store';
import {getAPIConfig} from 'terraso-client-shared/config';

// https://github.com/FormidableLabs/react-native-app-auth/blob/main/docs/config-examples/google.md
const googleConfig = {
  issuer: 'https://accounts.google.com',
  clientId: `${Config.GOOGLE_OAUTH_APP_GUID}.apps.googleusercontent.com`,
  redirectUrl: 'com.devclient:/oauth2redirect',
  scopes: ['openid', 'profile', 'email'],
};

export default function LoginView(): JSX.Element {
  const dispatch = useDispatch();
  const apiConfig = getAPIConfig();
  const onPress = useCallback(() => {
    authorize(googleConfig)
      .then(async result => {
        let {atoken, rtoken} = await exchangeToken(result.idToken, 'google');
        return Promise.all([
          apiConfig.tokenStorage.setToken('atoken', atoken),
          apiConfig.tokenStorage.setToken('rtoken', rtoken),
        ]);
      })
      .then(() => dispatch(setHasAccessTokenAsync()))
      .catch(e => console.error(e));
  }, []);

  return (
    <Button bgColor="primary.main" size="lg" onPress={onPress}>
      Login with Google
    </Button>
  );
}
