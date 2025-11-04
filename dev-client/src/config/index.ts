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

import Constants from 'expo-constants';

import {setAPIConfig, TerrasoAPIConfig} from 'terraso-client-shared/config';

import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

const ENV_CONFIG = Constants.expoConfig!.extra!;

setAPIConfig({
  terrasoAPIURL: ENV_CONFIG.TERRASO_BACKEND,
  graphQLEndpoint: ENV_CONFIG.TERRASO_BACKEND + '/graphql/',
  tokenStorage: {
    getToken: name => {
      const value = kvStorage.getString(name);
      return value === null ? undefined : value;
    },
    setToken: (name, value) => {
      kvStorage.setString(name, value);
    },
    removeToken: name => {
      kvStorage.remove(name);
    },
    initialToken: null,
  },
  // TODO: pick out logger
  logger: (_severity, args) => console.log(args),
} as TerrasoAPIConfig);

let googleClientId: string;
let googleRedirectURI: string;
let microsoftRedirectURI: string;

if (Platform.OS === 'ios') {
  googleClientId = ENV_CONFIG.GOOGLE_OAUTH_IOS_CLIENT_ID;
  googleRedirectURI = `${ENV_CONFIG.GOOGLE_OAUTH_IOS_URI_SCHEME}:/oauth2redirect`;
  microsoftRedirectURI = `msauth.${Constants.expoConfig!.ios!.bundleIdentifier}://auth/`;
} else if (Platform.OS === 'android') {
  googleClientId = ENV_CONFIG.GOOGLE_OAUTH_ANDROID_CLIENT_ID;
  googleRedirectURI = `${Constants.expoConfig!.android!.package}:/oauth2redirect`;
  microsoftRedirectURI = `${Constants.expoConfig!.android!.package}://msauth/${encodeURIComponent(ENV_CONFIG.MICROSOFT_SIGNATURE_HASH)}/`;
} else {
  throw new Error(`Unsupported platform ${Platform.OS}`);
}

const sentryEnabled = ENV_CONFIG.SENTRY_ENABLED;
if (sentryEnabled !== 'true' && sentryEnabled !== 'false') {
  throw new Error(
    `Config setting SENTRY_ENABLED set to invalid value: ${sentryEnabled}`,
  );
}

export const APP_CONFIG = {
  appleClientId: Constants.expoConfig!.ios?.bundleIdentifier!,
  microsoftClientId: ENV_CONFIG.MICROSOFT_OAUTH_CLIENT_ID,
  mapboxAccessToken: ENV_CONFIG.PUBLIC_MAPBOX_TOKEN,
  terrasoApiHostname: ENV_CONFIG.TERRASO_BACKEND.replace('https://', ''),
  sentryDsn: ENV_CONFIG.SENTRY_DSN,
  sentryEnabled: sentryEnabled === 'true',
  environment: ENV_CONFIG.ENV,
  build: ENV_CONFIG.APP_BUILD,
  version: Constants.expoConfig!.version,
  googleClientId,
  googleRedirectURI,
  microsoftRedirectURI,
  posthogHost: ENV_CONFIG.POSTHOG_HOST,
  posthogApiKey: ENV_CONFIG.POSTHOG_API_KEY,
  posthogDebug: ENV_CONFIG.POSTHOG_DEBUG,
  debugEnabled: ENV_CONFIG.DEBUG_ENABLED === 'true',
} as const;

// Debug flag for visualization and logging (keyboard layout, etc.)
// Set DEBUG_ENABLED="true" in .env to enable by default (requires rebuild)
// OR change 'false' to 'true' below for instant live-reload during development
// Automatically disabled during tests to prevent snapshot differences
export const debugEnabled =
  process.env.NODE_ENV === 'test'
    ? false
    : APP_CONFIG.debugEnabled
      ? true
      : false;
