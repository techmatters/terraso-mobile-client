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

import Constants from 'expo-constants';
import {MMKVLoader} from 'react-native-mmkv-storage';
import {setAPIConfig, TerrasoAPIConfig} from 'terraso-client-shared/config';
import {Platform} from 'react-native';
import {PACKAGE_NAME} from 'terraso-mobile-client/constants';

const Config = Constants.expoConfig!.extra!;

let terrasoAPIURL;

if (Platform.OS === 'ios') {
  terrasoAPIURL = Config.TERRASO_BACKEND ?? 'https://api.staging.terraso.net';
} else if (Platform.OS === 'android') {
  terrasoAPIURL =
    Config.TERRASO_BACKEND_ANDROID ??
    Config.TERRASO_BACKEND ??
    'https://api.staging.terraso.net';
}

const MMKV = new MMKVLoader().withEncryption().initialize();

setAPIConfig({
  terrasoAPIURL: terrasoAPIURL,
  graphQLEndpoint: terrasoAPIURL + '/graphql/',
  tokenStorage: {
    getToken: name => {
      const value = MMKV.getString(name);
      return value === null ? undefined : value;
    },
    setToken: (name, value) => MMKV.setStringAsync(name, value),
    removeToken: name => {
      MMKV.removeItem(name);
    },
    initialToken: null,
  },
  // TODO: pick out logger
  logger: (_severity, args) => console.log(args),
} as TerrasoAPIConfig);

// NOTE: This will be changed to be more general at some point, for now it's just grabbing
// values from the config setup
type AppConfig = {
  packageName: string;
  googleClientId: string;
  googleRedirectURI: string;
  appleClientId: string;
  appleRedirectURI: string;
  microsoftClientId: string;
  microsoftRedirectURI: string;
  mapboxAccessToken: string;
  sentryDsn: string;
  sentryEnabled: boolean;
  environment: string;
};

let googleClientId = '';
let googleRedirectURI = '';

const appleClientId = Config.APPLE_OAUTH_CLIENT_ID ?? '';
let appleRedirectURI = Config.APPLE_OAUTH_REDIRECT_URI ?? '';

const microsoftClientId = Config.MICROSOFT_OAUTH_CLIENT_ID ?? '';
let microsoftRedirectURI = '';

const microsoftSignatureHash = Config.MICROSOFT_SIGNATURE_HASH ?? '';

if (Platform.OS === 'ios') {
  googleClientId = Config.GOOGLE_OAUTH_IOS_CLIENT_ID ?? '';
  googleRedirectURI =
    `${Config.GOOGLE_OAUTH_IOS_URI_SCHEME}:/oauth2redirect` ?? '';
  microsoftRedirectURI =
    `msauth.${Constants.expoConfig!.ios!.bundleIdentifier}://auth/` ?? '';
} else if (Platform.OS === 'android') {
  googleClientId = Config.GOOGLE_OAUTH_ANDROID_CLIENT_ID ?? '';
  googleRedirectURI = `${Constants.expoConfig!.android!.package}:/oauth2redirect`;
  microsoftRedirectURI =
    `${Constants.expoConfig!.android!.package}://msauth/${encodeURIComponent(microsoftSignatureHash)}/` ??
    '';
}

if (Config.PUBLIC_MAPBOX_TOKEN === undefined) {
  throw new Error('Config setting PUBLIC_MAPBOX_TOKEN not set');
}

if (Config.SENTRY_DSN === undefined) {
  throw new Error('Config setting SENTRY_DSN not set');
}

if (Config.SENTRY_ENABLED !== 'true' && Config.SENTRY_ENABLED !== 'false') {
  throw new Error(
    `Config setting SENTRY_ENABLED set to invalid value: ${Config.SENTRY_ENABLED}`,
  );
}

if (Config.ENV === undefined) {
  throw new Error('Config setting ENV not set');
}

export const APP_CONFIG: AppConfig = {
  packageName: PACKAGE_NAME,
  googleClientId: googleClientId,
  googleRedirectURI: googleRedirectURI,
  appleClientId: appleClientId,
  appleRedirectURI: appleRedirectURI,
  microsoftClientId: microsoftClientId,
  microsoftRedirectURI: microsoftRedirectURI,
  mapboxAccessToken: Config.PUBLIC_MAPBOX_TOKEN,
  sentryDsn: Config.SENTRY_DSN,
  sentryEnabled: Config.SENTRY_ENABLED === 'true',
  environment: Config.ENV,
};
