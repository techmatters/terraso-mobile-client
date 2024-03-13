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

import {ExpoConfig, ConfigContext} from 'expo/config';
import {withEntitlementsPlist, withAppBuildGradle} from 'expo/config-plugins';

const VERSION_REGEX = /^v[0-9]+$/g;

let appVersion = 1;

if (typeof process.env.APP_VERSION === 'string') {
  if (!VERSION_REGEX.test(process.env.APP_VERSION)) {
    throw Error(
      `invalid app version format: ${process.env.APP_VERSION}. should be v[0-9]+`,
    );
  }
  appVersion = parseInt(process.env.APP_VERSION.slice(1), 10);
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
    icon: 'src/assets/landpks-round-1024.png',
    permissions: [
      'android.permissions.ACCESS_COARSE_LOCATION',
      'android.permissions.ACCESS_FINE_LOCATION',
    ],
    blockedPermissions: [
      'android.permissions.RECORD_AUDIO',
      'android.permissions.MODIFY_AUDIO_SETTINGS',
      'android.permissions.VIBRATE',
    ],
  },
  ios: {
    bundleIdentifier: 'org.terraso.test.Terraso-LandPKS',
    buildNumber: '0',
    icon: 'src/assets/landpks-square-1024.png',
    supportsTablet: true,
    requireFullScreen: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription:
        'Terraso LandPKS uses your photo library to analyze soil color.',
      NSCameraUsageDescription:
        'Terraso LandPKS uses your location to take photos of sites.',
      NSMicrophoneUsageDescription:
        'This application does not use your microphone.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Terraso LandPKS uses your location to create sites.',
      NSLocationWhenInUseUsageDescription: 'Show current location on map.',
      NSMotionUsageDescription:
        'Terraso LandPKS uses motion for the slope meter',
    },
  },
  plugins: [
    ['expo-screen-orientation', {initialOrientation: 'PORTRAIT'}],
    [
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOADS_TOKEN,
      },
    ],
    [
      (config: ExpoConfig) => {
        // workaround to remove push notification entitlements: https://github.com/expo/expo/pull/25808#pullrequestreview-1772795646
        withEntitlementsPlist(config, entitlements => {
          delete entitlements.modResults['aps-environment'];
          return entitlements;
        });
        // workaround to avoid double signing with debug keychain
        withAppBuildGradle(config, gradle => {
          gradle.modResults.contents = gradle.modResults.contents.replace(
            /signingConfig signingConfigs.debug/g,
            '',
          );
          return gradle;
        });
        return config;
      },
    ],
  ],
  extra: {
    ...Object.fromEntries(
      [
        'ENV',
        'PUBLIC_MAPBOX_TOKEN',
        'SENTRY_DSN',
        'TERRASO_BACKEND',
        'TERRASO_BACKEND_ANDROID',
        'GOOGLE_OAUTH_ANDROID_CLIENT_ID',
        'GOOGLE_OAUTH_IOS_CLIENT_ID',
        'GOOGLE_OAUTH_IOS_URI_SCHEME',
        'APPLE_OAUTH_CLIENT_ID',
        'APPLE_OAUTH_REDIRECT_URI',
        'MICROSOFT_OAUTH_CLIENT_ID',
        'MICROSOFT_SIGNATURE_HASH',
      ].map(k => [k, process.env[k]]),
    ),
  },
});
