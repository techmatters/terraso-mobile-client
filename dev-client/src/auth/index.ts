import {authorize} from 'react-native-app-auth';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {OAuthProvider} from 'terraso-mobile-client/types';
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

const appleConfig = {
  issuer: 'https://appleid.apple.com',
  clientId: APP_CONFIG.appleClientId,
  redirectUrl: APP_CONFIG.appleRedirectURI,
  scopes: ['openid', 'profile', 'email'],
};

const microsoftConfig = {
  issuer: 'https://login.microsoftonline.com/common/oauth2/v2.0/',
  clientId: APP_CONFIG.microsoftClientId,
  redirectUrl: APP_CONFIG.microsoftRedirectURI,
  scopes: ['openid', 'profile', 'email', 'offline_access'],
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

export async function auth(providerName) {
  let result;
  if (providerName === 'google') {
    result = await authorize(googleConfig);
    var platformOs = '';
    if (Platform.OS === 'android') {
      platformOs = 'google-android';
    } else if (Platform.OS === 'ios') {
      platformOs = 'google-ios';
    }
  } else if (providerName === 'apple') {
    result = await authorize(appleConfig);
  } else if (providerName === 'microsoft') {
    result = await authorize(microsoftConfig);
  } else {
    console.error(`${providerName} is not a recognized OAuth provider.`);
  }
  let {atoken, rtoken} = await exchangeToken(
    result.idToken,
    platformOs as OAuthProvider,
  );
  return Promise.all([
    apiConfig.tokenStorage.setToken('atoken', atoken),
    apiConfig.tokenStorage.setToken('rtoken', rtoken),
  ]);
}
