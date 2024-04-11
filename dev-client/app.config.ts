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
import {ExpoConfig, ConfigContext} from 'expo/config';
import {withAppBuildGradle} from 'expo/config-plugins';
import {fromEntries} from 'terraso-client-shared/utils';

const VERSION_REGEX = /^v[0-9]+$/g;

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
  'SENTRY_ORG',
  'SENTRY_PROJECT',
  'MAPBOX_DOWNLOADS_TOKEN',
] as const);

const ENV_CONFIG = validateEnvConfig(process.env, [
  'CI',
  'ENV',
  'PUBLIC_MAPBOX_TOKEN',
  'SENTRY_DSN',
  'SENTRY_ENABLED',
  'TERRASO_BACKEND',
  'GOOGLE_OAUTH_ANDROID_CLIENT_ID',
  'GOOGLE_OAUTH_IOS_CLIENT_ID',
  'GOOGLE_OAUTH_IOS_URI_SCHEME',
  // TODO: uncomment when these have been generated
  // 'APPLE_OAUTH_CLIENT_ID',
  // 'APPLE_OAUTH_REDIRECT_URI',
  'MICROSOFT_OAUTH_CLIENT_ID',
  'MICROSOFT_SIGNATURE_HASH',
] as const);

let appVersion = 1;
const APP_VERSION = process.env.APP_VERSION;

if (typeof APP_VERSION === 'string') {
  if (!VERSION_REGEX.test(APP_VERSION)) {
    throw Error(
      `invalid app version format: ${APP_VERSION}. should be v[0-9]+`,
    );
  }
  appVersion = parseInt(APP_VERSION.slice(1), 10);
}

export default ({config}: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Terraso LandPKS',
  slug: 'landpks',
  version: `1.0.${appVersion}`,
  orientation: 'portrait',
  splash: {
    image: 'src/assets/splash.png',
    backgroundColor: '#028843',
  },
  scheme: ['org.terraso.landpks', 'msauth.org.terraso.landpks'],
  android: {
    package: 'org.terraso.landpks',
    versionCode: appVersion,
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
    bundleIdentifier: 'org.terraso.test.Terraso-LandPKS',
    buildNumber: '2',
    icon: 'src/assets/landpks-round.png',
    supportsTablet: true,
    requireFullScreen: true,
    usesAppleSignIn: true,
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription:
        'Terraso LandPKS uses your photo library to analyze soil color.',
      NSCameraUsageDescription:
        'Terraso LandPKS uses your camera to take photos of sites.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Terraso LandPKS uses your location to create sites.',
      NSLocationWhenInUseUsageDescription: 'Show current location on map.',
      NSMotionUsageDescription:
        'Terraso LandPKS uses motion for the slope meter',
    },
  },
  plugins: [
    ["expo-apple-authentication"],
    ['expo-screen-orientation', {initialOrientation: 'PORTRAIT'}],
    [
      '@sentry/react-native/expo',
      {
        organization: BUILD_CONFIG.SENTRY_ORG,
        project: BUILD_CONFIG.SENTRY_PROJECT,
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
