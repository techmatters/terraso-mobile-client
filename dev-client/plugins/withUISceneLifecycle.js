/**
 * Adopt the UIScene life cycle on iOS.
 *
 * iOS/iPadOS 27 refuses to launch an app that hasn't adopted the UIScene life
 * cycle: UIKit traps in `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`
 * the moment the first scene connects — EXC_BREAKPOINT / SIGTRAP, before a line
 * of JS runs. iOS 26 only warned; iOS 27 hard-crashes. (A "Designed for iPad"
 * build on an Apple-Silicon Mac does *not* enforce this, which is why the same
 * TestFlight build launches on macOS but dies on a real iPad running iPadOS 27.)
 *
 * Neither React Native 0.86 nor Expo SDK 57's bare template ships scene support
 * (no UIWindowSceneDelegate, no UIApplicationSceneManifest), so the app has to
 * adopt it itself. Expo SDK 57 *does* ship the delegate that does the work
 * (`ExpoAppSceneDelegate`: it makes the window from the connecting scene, starts
 * React Native into it, and forwards URLs / universal links / quick actions).
 * This plugin wires it in — the three changes the template omits:
 *
 *   1. `Info.plist` declares a scene manifest naming `SceneDelegate`;
 *   2. `SceneDelegate.swift`, an empty `ExpoAppSceneDelegate` subclass, is
 *      written into the app target (and registered in the Xcode project);
 *   3. `AppDelegate.swift` stops creating the window and starting React Native
 *      (the scene delegate does both now) and declares itself an
 *      `ExpoReactNativeFactoryProvider`, which is how the scene delegate finds
 *      the factory `didFinishLaunchingWithOptions` still creates.
 *
 * Both halves are required together: declaring the manifest without moving the
 * window creation yields a black screen instead of a crash.
 *
 * Registered FIRST in app.config.ts so it runs LAST (config plugins within one
 * native mod run in reverse registration order). That way any other plugin that
 * inserts lines into AppDelegate.swift (e.g. @sentry/react-native) runs first
 * and finds the template shape it expects; this plugin then removes only its own
 * target lines from the final result.
 *
 * Every edit is checked: if the Expo template ever changes shape, prebuild fails
 * here loudly rather than silently shipping a binary that launches on nothing
 * newer than iOS 26. Delete this plugin once Expo's own template adopts scenes.
 *
 * Adapted from the community fix in expo/expo#46663/#46664 (see dmadan86/waves#1001).
 */

const fs = require('fs');
const path = require('path');
const {
  IOSConfig,
  withAppDelegate,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require('expo/config-plugins');

const SCENE_DELEGATE_FILE = 'SceneDelegate.swift';

const SCENE_DELEGATE_SOURCE = `internal import Expo

/// The UIScene delegate iOS 27 requires. All the work — creating the window,
/// starting React Native, forwarding URLs and quick actions — is Expo's
/// \`ExpoAppSceneDelegate\`. Written by \`plugins/withUISceneLifecycle.js\`.
class SceneDelegate: ExpoAppSceneDelegate {}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, cfg => {
    cfg.modResults.UIApplicationSceneManifest = {
      // One window; LandPKS Soil ID is not a multi-window iPad app.
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
}

function withSceneDelegateFile(config) {
  const withFile = withDangerousMod(config, [
    'ios',
    cfg => {
      const projectName = IOSConfig.XcodeUtils.getProjectName(
        cfg.modRequest.projectRoot,
      );
      const file = path.join(
        cfg.modRequest.platformProjectRoot,
        projectName,
        SCENE_DELEGATE_FILE,
      );
      fs.writeFileSync(file, SCENE_DELEGATE_SOURCE);
      return cfg;
    },
  ]);
  return withXcodeProject(withFile, cfg => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(
      cfg.modRequest.projectRoot,
    );
    const filepath = path.join(projectName, SCENE_DELEGATE_FILE);
    if (!cfg.modResults.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath,
        groupName: projectName,
        project: cfg.modResults,
      });
    }
    return cfg;
  });
}

/** Swap `from` for `to` exactly once, or fail the prebuild saying which edit. */
function replaceOnce(source, from, to, what) {
  const matches = source.match(from);
  if (!matches || matches.length === 0) {
    throw new Error(
      `withUISceneLifecycle: could not ${what} in AppDelegate.swift — the Expo ` +
        `template has changed shape. Update plugins/withUISceneLifecycle.js (or ` +
        `delete it if the template now adopts the scene life cycle itself).`,
    );
  }
  return source.replace(from, to);
}

/**
 * The AppDelegate edit, exported so it can be unit-tested against the template's
 * current shape. Idempotent: an AppDelegate that already provides the factory is
 * returned untouched.
 */
function patchAppDelegate(source) {
  if (source.includes('ExpoReactNativeFactoryProvider')) {
    return source;
  }

  let patched = replaceOnce(
    source,
    /class AppDelegate: ExpoAppDelegate \{/,
    'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    'declare AppDelegate an ExpoReactNativeFactoryProvider',
  );
  // The scene delegate makes the window from the connecting UIWindowScene.
  patched = replaceOnce(
    patched,
    /\n[ \t]*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n/,
    '\n',
    'remove the app delegate creating its own window',
  );
  // …and starts React Native into it (rebuilding launch options from the scene's
  // connection options so a cold-start deep link still arrives).
  patched = replaceOnce(
    patched,
    /\n[ \t]*factory\.startReactNative\(\s*withModuleName: "main",\s*in: window,\s*launchOptions: launchOptions\)\n/,
    '\n',
    'remove the app delegate starting React Native',
  );
  return patched;
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, cfg => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withUISceneLifecycle: expected a Swift AppDelegate');
    }
    cfg.modResults.contents = patchAppDelegate(cfg.modResults.contents);
    return cfg;
  });
}

module.exports = function withUISceneLifecycle(config) {
  let cfg = withSceneManifest(config);
  cfg = withSceneDelegateFile(cfg);
  cfg = withSceneAppDelegate(cfg);
  return cfg;
};

module.exports.patchAppDelegate = patchAppDelegate;
