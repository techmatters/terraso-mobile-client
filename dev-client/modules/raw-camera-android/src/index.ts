import {Platform} from 'react-native';

import {NitroModules} from 'react-native-nitro-modules';

import type {RawCameraAndroid} from './RawCameraAndroid.nitro';

export type {RawCameraAndroid, CapturedPhoto} from './RawCameraAndroid.nitro';
export {RawCameraAndroidView} from './RawCameraAndroidView';
export type {RawCameraAndroidViewProps} from './RawCameraAndroidView';

// Android-only HybridObject. Guard the createHybridObject call at
// module-load time so importing this file on iOS is safe — the
// HybridObject isn't registered there, and calling createHybridObject
// would throw at import time (breaking the whole JS bundle, since
// screenDefinitions imports AndroidRawCaptureScreen which imports
// this file). On iOS we hand back a proxy that throws with a
// platform-clear message the moment any method is actually called.
const platformStub = new Proxy(
  {},
  {
    get(_target, prop) {
      throw new Error(
        `RawCameraAndroidHybrid.${String(prop)} called on iOS — ` +
          'this module is Android-only. Callers should Platform-gate.',
      );
    },
  },
) as RawCameraAndroid;

export const RawCameraAndroidHybrid: RawCameraAndroid =
  Platform.OS === 'android'
    ? NitroModules.createHybridObject<RawCameraAndroid>('RawCameraAndroid')
    : platformStub;
