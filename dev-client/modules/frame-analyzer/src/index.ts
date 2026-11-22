import {Platform} from 'react-native';

import {NitroModules} from 'react-native-nitro-modules';

import type {FrameAnalyzer} from './FrameAnalyzer.nitro';

export type {FrameAnalyzer, RoiLumaStats} from './FrameAnalyzer.nitro';

// iOS-only HybridObject. Guard createHybridObject at module load so
// importing this file on Android is safe — the module isn't registered
// there and calling createHybridObject would throw at import time.
// Same pattern as raw-camera-android's platform stub, mirrored the
// other way.
const platformStub = new Proxy(
  {},
  {
    get(_target, prop) {
      throw new Error(
        `FrameAnalyzerHybrid.${String(prop)} called on ${Platform.OS} — ` +
          'this module is iOS-only. Callers should Platform-gate.',
      );
    },
  },
) as FrameAnalyzer;

export const FrameAnalyzerHybrid: FrameAnalyzer =
  Platform.OS === 'ios'
    ? NitroModules.createHybridObject<FrameAnalyzer>('FrameAnalyzer')
    : platformStub;
