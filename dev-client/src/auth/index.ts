import {authorize} from 'react-native-app-auth';
import {APP_CONFIG} from '../config';
import {OAuthProvider} from '../types';
import {request} from 'terraso-client-shared/terrasoApi/api';
import {getAPIConfig} from 'terraso-client-shared/config';
import {Platform} from 'react-native';

// https://github.com/FormidableLabs/react-native-app-auth/blob/main/docs/config-examples/google.md
const googleConfig = {
  issuer: 'https://accounts.google.com',
  clientId: APP_CONFIG.googleClientId,
  redirectUrl: APP_CONFIG.googleRedirectURI,
  scopes: ['openid', 'profile', 'email'],
};

interface AuthTokens {
  atoken: string;
  rtoken: string;
}

export async function exchangeToken(
  identityJwt: string,
  provider: OAuthProvider,
) {
  const payload = await request<AuthTokens>({
    path: '/auth/token-exchange',
    body: {provider, jwt: identityJwt},
    headers: {'content-type': 'application/json'},
  });

  return {
    atoken: payload.atoken,
    rtoken: payload.rtoken,
  };
}

const apiConfig = getAPIConfig();

export async function auth() {
  let result = await authorize(googleConfig);
  let {atoken, rtoken} = await exchangeToken(
    result.idToken,
    Platform.OS === 'android' ? 'google-android' : 'google-ios',
  );
  return Promise.all([
    apiConfig.tokenStorage.setToken('atoken', atoken),
    apiConfig.tokenStorage.setToken('rtoken', rtoken),
  ]);
}
