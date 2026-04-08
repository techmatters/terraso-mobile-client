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

import {Platform} from 'react-native';

import {AppleAuthenticationScope, signInAsync} from 'expo-apple-authentication';
import {
  AccessTokenRequest,
  AuthRequest,
  AuthRequestConfig,
  IssuerOrDiscovery,
  resolveDiscoveryAsync,
} from 'expo-auth-session';

import {getAPIConfig} from 'terraso-client-shared/config';
import {request} from 'terraso-client-shared/terrasoApi/api';

import {APP_CONFIG} from 'terraso-mobile-client/config';

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
  is_new_account?: boolean;
}

type AppleNameInfo = {
  firstName?: string;
  lastName?: string;
};

async function exchangeToken(
  identityJwt: string,
  provider: Omit<AuthProvider, 'google'> | `google-${'ios' | 'android'}`,
  appleNames?: AppleNameInfo,
) {
  let body: any = {
    provider,
    jwt: identityJwt,
  };
  if (provider === 'apple' && Platform.OS === 'ios') {
    body.client_id = configs.apple.clientId;
  }
  // Apple's id_token does not contain name claims; if the iOS Sign in with
  // Apple credential gave us the user's name (only happens on the very first
  // authorization), forward it so the backend can persist/backfill it.
  if (appleNames?.firstName) {
    body.first_name = appleNames.firstName;
  }
  if (appleNames?.lastName) {
    body.last_name = appleNames.lastName;
  }

  const payload = await request<AuthTokens>({
    path: '/auth/token-exchange',
    body: body,
    headers: {'content-type': 'application/json'},
  });

  return {
    atoken: payload.atoken,
    rtoken: payload.rtoken,
    is_new_account: payload.is_new_account,
  };
}

const apiConfig = getAPIConfig();

type AppleSignInResult = {
  idToken: string;
  firstName?: string;
  lastName?: string;
};

async function getAppleSignInResult(): Promise<AppleSignInResult | undefined> {
  try {
    const credential = await signInAsync({
      requestedScopes: [
        AppleAuthenticationScope.FULL_NAME,
        AppleAuthenticationScope.EMAIL,
      ],
    });

    if (credential.identityToken === null) {
      return undefined;
    }

    // credential.fullName is populated only on the very first authorization
    // for this Apple ID + Service ID; on subsequent sign-ins it's all nulls.
    return {
      idToken: credential.identityToken,
      firstName: credential.fullName?.givenName ?? undefined,
      lastName: credential.fullName?.familyName ?? undefined,
    };
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
  let appleNames: AppleNameInfo | undefined;

  if (provider === 'apple' && Platform.OS === 'ios') {
    const result = await getAppleSignInResult();
    if (result) {
      idToken = result.idToken;
      appleNames = {
        firstName: result.firstName,
        lastName: result.lastName,
      };
    }
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

  let {atoken, rtoken, is_new_account} = await exchangeToken(
    idToken,
    platformProvider,
    appleNames,
  );

  await Promise.all([
    apiConfig.tokenStorage.setToken('atoken', atoken),
    apiConfig.tokenStorage.setToken('rtoken', rtoken),
  ]);

  return {is_new_account};
}
