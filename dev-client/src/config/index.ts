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
import {MMKVLoader} from 'react-native-mmkv-storage';

import Constants from 'expo-constants';

import {setAPIConfig, TerrasoAPIConfig} from 'terraso-client-shared/config';

const ENV_CONFIG = Constants.expoConfig!.extra!;

const MMKV = new MMKVLoader().withEncryption().initialize();

setAPIConfig({
  terrasoAPIURL: ENV_CONFIG.TERRASO_BACKEND,
  graphQLEndpoint: ENV_CONFIG.TERRASO_BACKEND + '/graphql/',
  tokenStorage: {
    getToken: name => {
      const value = MMKV.getString(name);
      return value === null ? undefined : value;
    },
    setToken: (name, value) => {
      MMKV.setStringAsync(name, value);
    },
    removeToken: name => {
      MMKV.removeItem(name);
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
  sentryDsn: ENV_CONFIG.SENTRY_DSN,
  sentryEnabled: sentryEnabled === 'true',
  environment: ENV_CONFIG.ENV,
  version: ENV_CONFIG.APP_VERSION,
  build: ENV_CONFIG.APP_BUILD,
  googleClientId,
  googleRedirectURI,
  microsoftRedirectURI,
} as const;
