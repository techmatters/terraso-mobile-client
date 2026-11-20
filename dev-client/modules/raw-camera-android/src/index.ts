import {Platform} from 'react-native';

import {NitroModules} from 'react-native-nitro-modules';

import type {
  AnalyzerRoi,
  FrameAnalyzer,
  RawCameraAndroid,
  RoiLumaStats,
} from './RawCameraAndroid.nitro';

export type {
  AnalyzerRoi,
  CaptureCapabilities,
  CaptureOptions,
  CaptureSessionRequest,
  CapturedPhoto,
  FrameAnalyzer,
  RawCameraAndroid,
  RoiLumaStats,
  SessionContext,
  SessionShot,
} from './RawCameraAndroid.nitro';
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

// Create + configure the injectable live-frame analyzer. Android-only;
// returns null off-platform so callers can Platform-gate. Pass the result to
// RawCameraAndroidHybrid.setAnalyzer(); the camera pumps frames into it and it
// emits per-ROI luma stats via onStats.
export const createRoiAnalyzer = (
  rois: AnalyzerRoi[],
  onStats: (stats: RoiLumaStats[]) => void,
): FrameAnalyzer | null => {
  if (Platform.OS !== 'android') {
    return null;
  }
  const analyzer = NitroModules.createHybridObject<FrameAnalyzer>(
    'FrameAnalyzer',
  );
  analyzer.configure(rois, onStats);
  return analyzer;
};
