/*
 * Copyright © 2024 Technology Matters
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

import 'ts-node/register';

import {ConfigContext, ExpoConfig} from 'expo/config';
import {withAppBuildGradle} from 'expo/config-plugins';

import {fromEntries} from 'terraso-client-shared/utils';

const BUILD_REGEX = /^v[0-9]+$/g;

const STRICT = process.env.STRICT === 'true';

const validateEnvConfig = <K extends string>(
  env: Record<string, string | undefined>,
  variables: readonly K[],
) =>
  fromEntries(
    variables.map(k => {
      const value = env[k];
      if (STRICT && value === undefined) {
        throw new Error(`Config setting ${k} not set`);
      }
      return [k, value];
    }),
  );

const BUILD_CONFIG = validateEnvConfig(process.env, [
  'MAPBOX_DOWNLOADS_TOKEN',
] as const);

const ENV_CONFIG = validateEnvConfig(process.env, [
  'APP_VERSION',
  'APP_BUILD',
  'CI',
  'ENV',
  'PUBLIC_MAPBOX_TOKEN',
  'SENTRY_DSN',
  'SENTRY_ENABLED',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
  'TERRASO_BACKEND',
  'GOOGLE_OAUTH_ANDROID_CLIENT_ID',
  'GOOGLE_OAUTH_IOS_CLIENT_ID',
  'GOOGLE_OAUTH_IOS_URI_SCHEME',
  'MICROSOFT_OAUTH_CLIENT_ID',
  'MICROSOFT_SIGNATURE_HASH',
] as const);

let buildNumber = 1;
let versionNumber = '1.0';
const APP_VERSION = process.env.APP_VERSION;
const APP_BUILD = process.env.APP_BUILD;

if (typeof APP_BUILD === 'string') {
  if (!BUILD_REGEX.test(APP_BUILD)) {
    throw Error(`invalid app build format: ${APP_BUILD}. should be v[0-9]+`);
  }
  buildNumber = parseInt(APP_BUILD.slice(1), 10);
  ENV_CONFIG.APP_BUILD = buildNumber.toString();
}

if (typeof APP_VERSION === 'string') {
  versionNumber = APP_VERSION;
  ENV_CONFIG.APP_VERSION = versionNumber;
}

export default ({config}: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'LandPKS Soil ID',
  slug: 'landpks',
  version: versionNumber,
  orientation: 'portrait',
  splash: {
    image: 'src/assets/splash.png',
    backgroundColor: '#028843',
  },
  scheme: ['org.terraso.landpks', 'msauth.org.terraso.landpks'],
  android: {
    package: 'org.terraso.landpks',
    versionCode: buildNumber,
    icon: 'src/assets/landpks-round.png',
    adaptiveIcon: {
      foregroundImage: 'src/assets/landpks-android-adaptive.png',
    },
    permissions: [
      'android.permissions.ACCESS_COARSE_LOCATION',
      'android.permissions.ACCESS_FINE_LOCATION',
    ],
    blockedPermissions: [
      'android.permissions.ACTIVITY_RECOGNITION',
      'android.permissions.RECORD_AUDIO',
      'android.permissions.MODIFY_AUDIO_SETTINGS',
      'android.permissions.VIBRATE',
    ],
  },
  ios: {
    bundleIdentifier: 'org.terraso.landpks',
    buildNumber: buildNumber.toString(),
    icon: 'src/assets/landpks-round.png',
    supportsTablet: true,
    requireFullScreen: true,
    usesAppleSignIn: true,
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription:
        'LandPKS Soil ID uses your photo library to analyze soil color.',
      NSCameraUsageDescription:
        'LandPKS Soil ID uses your camera to analyze soil color.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'LandPKS Soil ID uses your location to create sites.',
      NSLocationWhenInUseUsageDescription:
        'LandPKS Soil ID uses your location to create sites.',
      NSMotionUsageDescription:
        'LandPKS Soil ID uses motion to determine slope steepness',
    },
  },
  plugins: [
    ['expo-apple-authentication'],
    ['expo-screen-orientation', {initialOrientation: 'PORTRAIT'}],
    [
      '@sentry/react-native/expo',
      {
        organization: ENV_CONFIG.SENTRY_ORG,
        project: ENV_CONFIG.SENTRY_PROJECT,
      },
    ],
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsDownloadToken: BUILD_CONFIG.MAPBOX_DOWNLOADS_TOKEN,
      },
    ],
    [
      ((modConfig: ExpoConfig): ExpoConfig => {
        // Avoid double signing with debug keychain when using GitHub actions.
        if (ENV_CONFIG.CI === 'true') {
          withAppBuildGradle(modConfig, gradle => {
            gradle.modResults.contents = gradle.modResults.contents.replace(
              /signingConfig signingConfigs.debug/g,
              '',
            );
            return gradle;
          });
        }
        return modConfig;
      }) as any,
    ],
  ],
  extra: ENV_CONFIG,
});
