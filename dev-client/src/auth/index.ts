/*
 * Copyright © 2023 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {APP_CONFIG} from 'terraso-mobile-client/config';
import {request} from 'terraso-client-shared/terrasoApi/api';
import {getAPIConfig} from 'terraso-client-shared/config';
import {Platform} from 'react-native';
import {
  AccessTokenRequest,
  AuthRequest,
  AuthRequestConfig,
  IssuerOrDiscovery,
  resolveDiscoveryAsync,
} from 'expo-auth-session';
import {AppleAuthenticationScope, signInAsync} from 'expo-apple-authentication';
import Constants from 'expo-constants';

type AuthConfig = AuthRequestConfig & {issuer: IssuerOrDiscovery};

const configs = {
  // https://github.com/FormidableLabs/react-native-app-auth/blob/main/docs/config-examples/google.md
  google: {
    issuer: 'https://accounts.google.com',
    clientId: APP_CONFIG.googleClientId,
    redirectUri: APP_CONFIG.googleRedirectURI,
    scopes: ['openid', 'profile', 'email'],
  },
  // For Apple Authentication, we use native code and don't redirect.
  // TypeScript requries that redirectUri is present.
  apple: {
    issuer: 'https://appleid.apple.com',
    clientId: APP_CONFIG.appleClientId,
    redirectUri: '',
    scopes: ['name', 'email'],
  },
  /*
  Using string issuer fails, because MS returns issuer: "https://login.microsoftonline.com/{tenantid}/v2.0"
 from https://login.microsoftonline.com/common//v2.0/.well-known/openid-configuration.

  React Native App Auth trys to load "issuer", resulting in a 404 error and the JSON parsing fails with this error:
  Error: JSON error parsing document at 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration': Invalid URL: issuer

  Workaround is to pass serviceConfiguration directly. Note that Microsoft does ot have a revocationEndpoint.
 */
  microsoft: {
    issuer: {
      authorizationEndpoint:
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenEndpoint:
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    },
    clientId: APP_CONFIG.microsoftClientId,
    redirectUri: APP_CONFIG.microsoftRedirectURI,
    scopes: ['openid', 'profile', 'email', 'offline_access'],
  },
} as const satisfies Record<string, AuthConfig>;

export type AuthProvider = keyof typeof configs;

interface AuthTokens {
  atoken: string;
  rtoken: string;
}

async function exchangeToken(
  identityJwt: string,
  provider: Omit<AuthProvider, 'google'> | `google-${'ios' | 'android'}`,
) {
  let body: any = {
    provider,
    jwt: identityJwt,
  };
  if (provider === 'apple') {
    body.client_id = Constants.expoConfig!.ios?.bundleIdentifier;
  }
  const payload = await request<AuthTokens>({
    path: '/auth/token-exchange',
    body: body,
    headers: {'content-type': 'application/json'},
  });

  return {
    atoken: payload.atoken,
    rtoken: payload.rtoken,
  };
}

const apiConfig = getAPIConfig();

async function getAppleIdToken() {
  try {
    let idToken = (
      await signInAsync({
        requestedScopes: [
          AppleAuthenticationScope.FULL_NAME,
          AppleAuthenticationScope.EMAIL,
        ],
      })
    ).identityToken;

    // The two auth methods have different types the return:
    // - signInAsync can return string|null
    // - AccessTokenRequest can return string|undefined
    // To work around this, I confirm the Apple idToken is not null.
    // before returning it.
    return idToken !== null ? idToken : undefined;
  } catch (e: any) {
    if (e.code === 'ERR_REQUEST_CANCELED') {
      console.log('Sign in with Apple canceled', e);
    } else {
      console.error('Sign in with Apple error', e);
    }
  }
}

async function getGoogleMicrosoftIdToken(provider: AuthProvider) {
  const {issuer, ...config} = configs[provider];
  const authRequest = new AuthRequest(config);
  const discovery = await resolveDiscoveryAsync(issuer);
  const result = await authRequest.promptAsync(discovery);

  if (result.type !== 'success') {
    return;
  }

  return (
    await new AccessTokenRequest({
      ...config,
      code: result.params.code,
      extraParams: {code_verifier: authRequest.codeVerifier ?? ''},
    }).performAsync(discovery)
  ).idToken;
}

export async function auth(provider: AuthProvider) {
  let idToken: string | undefined;
  if (provider === 'apple' && Platform.OS === 'ios') {
    idToken = await getAppleIdToken();
  } else {
    idToken = await getGoogleMicrosoftIdToken(provider);
  }

  if (!idToken) {
    return Promise.reject('Authentication: no ID token found');
  }

  const platformProvider =
    provider !== 'google'
      ? provider
      : Platform.OS === 'android'
        ? 'google-android'
        : 'google-ios';

  let {atoken, rtoken} = await exchangeToken(idToken, platformProvider);

  return Promise.all([
    apiConfig.tokenStorage.setToken('atoken', atoken),
    apiConfig.tokenStorage.setToken('rtoken', rtoken),
  ]);
}
