import {Button, VStack} from 'native-base';
import {useCallback} from 'react';
import {authorize} from 'react-native-app-auth';

import Config from 'react-native-config';

// https://github.com/FormidableLabs/react-native-app-auth/blob/main/docs/config-examples/google.md
const googleConfig = {
  issuer: 'https://accounts.google.com',
  clientId: `${Config.GOOGLE_OAUTH_APP_GUID}.apps.googleusercontent.com`,
  redirectUrl: 'com.devclient:/oauth2redirect',
  scopes: ['openid', 'profile'],
};

export default function LoginView(): JSX.Element {
  const onPress = useCallback(() => {
    console.debug(googleConfig);
    authorize(googleConfig)
      .then(result => console.debug(result))
      .catch(e => console.error(e));
  }, [googleConfig, authorize]);

  return (
    <Button bgColor="primary.main" size="lg" onPress={onPress}>
      Login with Google
    </Button>
  );
}
