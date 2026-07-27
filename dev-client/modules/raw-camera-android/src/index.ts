import {NitroModules} from 'react-native-nitro-modules';

import type {RawCameraAndroid} from './RawCameraAndroid.nitro';

export type {RawCameraAndroid, CapturedPhoto} from './RawCameraAndroid.nitro';

// Android-only. On iOS this HybridObject isn't registered — importing
// this file on iOS is safe (module is a no-op) but calling any method
// will throw a Nitro registry error. Consumers should Platform-gate.
export const RawCameraAndroidHybrid =
  NitroModules.createHybridObject<RawCameraAndroid>('RawCameraAndroid');
