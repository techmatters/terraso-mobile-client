import {NitroModules} from 'react-native-nitro-modules';

import type {DngDecoder} from './DngDecoder.nitro';

export type {DngDecoder, DngMetadata, LinearRgb, Roi} from './DngDecoder.nitro';

export const DngDecoderHybrid =
  NitroModules.createHybridObject<DngDecoder>('DngDecoder');
