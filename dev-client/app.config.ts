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

import * as fs from 'fs';
import * as path from 'path';

import {ExpoConfig} from 'expo/config';
import {
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
} from 'expo/config-plugins';

import {withSentry} from '@sentry/react-native/expo';

import {fromEntries} from 'terraso-client-shared/utils';

const BUILD_REGEX = /^v?(?<build>[0-9]+)(?<tag>staging)?$/;

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

const ENV_CONFIG = {
  ...validateEnvConfig(process.env, [
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
    'POSTHOG_API_KEY',
    'POSTHOG_HOST',
  ] as const),
  // Optional: defaults to undefined (treated as 'false' in config/index.ts)
  POSTHOG_DEBUG: process.env.POSTHOG_DEBUG,
  DEBUG_ENABLED: process.env.DEBUG_ENABLED,
  SYNC_DEBUG_ENABLED: process.env.SYNC_DEBUG_ENABLED,
  ALWAYS_SHOW_WELCOME: process.env.ALWAYS_SHOW_WELCOME,
  // Cloudflare Worker for feature flags (session recording config, etc.)
  FEATURE_FLAG_URL: process.env.FEATURE_FLAG_URL,
  FEATURE_FLAG_SECRET: process.env.FEATURE_FLAG_SECRET,
};

let buildNumber = 1;
const APP_BUILD = process.env.APP_BUILD;

if (typeof APP_BUILD === 'string') {
  const result = BUILD_REGEX.exec(APP_BUILD);
  if (result === null) {
    throw Error(
      `invalid app build: ${APP_BUILD}. should be v[0-9]+ or v[0-9]+staging`,
    );
  }
  buildNumber = parseInt(result.groups!.build, 10);

  ENV_CONFIG.APP_BUILD = buildNumber.toString();
}

// This app outgrew the React Native template's 2GB default: release builds intermittently failed with OutOfMemoryError while merging our ~48k classes into dex. That merge step runs inside the Gradle daemon, so grow the daemon's heap.
const GRADLE_JVM_ARGS = '-Xmx6g -XX:MaxMetaspaceSize=512m';

const withGradleHeap = (modConfig: ExpoConfig): ExpoConfig =>
  withGradleProperties(modConfig, gradle => {
    const jvmArgs = gradle.modResults.find(
      item => item.type === 'property' && item.key === 'org.gradle.jvmargs',
    );
    // The React Native template always ships this property, so its absence means the template changed and this override has silently stopped applying. Fail here rather than let the build run out of heap 15 minutes later.
    if (jvmArgs?.type !== 'property') {
      throw new Error(
        `Expected org.gradle.jvmargs in gradle.properties; cannot apply "${GRADLE_JVM_ARGS}".`,
      );
    }
    jvmArgs.value = GRADLE_JVM_ARGS;
    return gradle;
  });

// Stop the PostHog pod from emitting a Swift module interface.
// Xcode 26 fails release archives with:
//   error: underlying Objective-C module 'PostHog' not found
//   error: failed to verify module interface of 'PostHog' ...
//   ** ARCHIVE FAILED **
// The PostHog iOS SDK (a pod dependency of `posthog-react-native`) is a
// mixed Swift/ObjC module built with library evolution; its emitted
// `PostHog.swiftinterface` opens with `@_exported import PostHog` — a
// self-import the SwiftVerifyEmittedModuleInterface task then rejects
// because PostHog ships no standalone ObjC modulemap. PostHog 3.68.4
// turns this emission on where 3.68.2 did not, so the failure started
// appearing on release runs that picked up the newer point release
// (ios/Podfile.lock isn't tracked in git — prebuild regenerates the
// whole ios/ tree, so CI can silently bump PostHog).
//
// An earlier attempt set SWIFT_VERIFY_EMITTED_MODULE_INTERFACE=NO on
// the pod. That setting is NOT honored under the implicit-modules
// pipeline CI actually uses — the verify task is still scheduled and
// still throws (reproduced locally on Xcode 26.6). The reliable lever
// is BUILD_LIBRARY_FOR_DISTRIBUTION=NO: with library evolution off, no
// `.swiftinterface` is emitted, so there is nothing to verify. This is
// correct for a pod compiled straight into the app — distributable
// module interfaces only matter for prebuilt binary frameworks, which
// PostHog is not here. (Verified locally: BUILD_LIBRARY_FOR_DISTRIBUTION
// =NO archives cleanly; the verify flag alone does not.) The verify
// flag is left set too as harmless defense-in-depth for pipelines that
// do honor it.
//
// Only PostHog is targeted so nothing changes for our own code or
// other pods.
const withPostHogSwiftInterfaceFix = (modConfig: ExpoConfig): ExpoConfig =>
  withDangerousMod(modConfig, [
    'ios',
    async config => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile',
      );
      let contents = await fs.promises.readFile(podfilePath, 'utf8');
      // Idempotent — bail if we've already injected this once.
      if (contents.includes("target.name == 'PostHog'")) return config;
      const hook = `
    installer.pods_project.targets.each do |target|
      if target.name == 'PostHog'
        target.build_configurations.each do |c|
          c.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'NO'
          c.build_settings['SWIFT_VERIFY_EMITTED_MODULE_INTERFACE'] = 'NO'
        end
      end
    end
`;
      const replaced = contents.replace(
        /post_install do \|installer\|\n/,
        `post_install do |installer|\n${hook}`,
      );
      if (replaced === contents) {
        throw new Error(
          'Could not find `post_install do |installer|` block in Podfile — ' +
            'PostHog Swift-interface fix was not applied.',
        );
      }
      await fs.promises.writeFile(podfilePath, replaced);
      return config;
    },
  ]);

const defaultConfig: ExpoConfig = {
  name: 'LandPKS Soil ID',
  slug: 'landpks',
  version: '1.4.7',
  newArchEnabled: true,
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
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
    blockedPermissions: [
      'android.permission.ACTIVITY_RECOGNITION',
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.VIBRATE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      // Block legacy storage permissions - deprecated on Android 13+, cause Play Store rejection
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      // Block broad media permissions - app uses Android Photo Picker instead
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      // Note: READ_MEDIA_VISUAL_USER_SELECTED is intentionally NOT blocked -
      // it's the correct permission for Android 14+ Photo Picker usage
      // Block SYSTEM_ALERT_WINDOW only in CI/release builds - needed for dev menu in debug
      ...(ENV_CONFIG.CI === 'true'
        ? ['android.permission.SYSTEM_ALERT_WINDOW']
        : []),
    ],
  },
  ios: {
    bundleIdentifier: 'org.terraso.landpks',
    appleTeamId: '2A8W5MT5NL',
    buildNumber: buildNumber.toString(),
    icon: 'src/assets/landpks-round.png',
    supportsTablet: true,
    requireFullScreen: true,
    usesAppleSignIn: true,
    entitlements: {
      'aps-environment': 'development',
    },
    infoPlist: {
      LSMinimumSystemVersion: '12.0',
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
    ['expo-localization'],
    ['expo-screen-orientation', {initialOrientation: 'PORTRAIT'}],
    ['expo-web-browser'],
    ['expo-video'],
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
    [withGradleHeap as any],
    [withPostHogSwiftInterfaceFix as any],
    [
      'expo-build-properties',
      {
        ios: {},
        android: {
          gradleVersion: '8.14.3',
          minSdkVersion: 26, // Required for PostHog session replay
        },
      },
    ],
  ],
  extra: ENV_CONFIG,
};

export default withSentry(defaultConfig, {
  url: 'https://sentry.io/',
  organization: ENV_CONFIG.SENTRY_ORG,
  project: ENV_CONFIG.SENTRY_PROJECT,
});
