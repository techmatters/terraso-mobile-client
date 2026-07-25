import type {HybridObject} from 'react-native-nitro-modules';

export type Roi = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LinearRgb = {
  r: number;
  g: number;
  b: number;
};

export type DngMetadata = {
  width: number;
  height: number;
  bitsPerSample: number;
  cfaPattern: string;
  blackLevel: number;
  whiteLevel: number;
  isMonochrome: boolean;
};

export interface DngDecoder
  extends HybridObject<{ios: 'swift'; android: 'kotlin'}> {
  readMetadata(dngPath: string): DngMetadata;

  decodeDngRois(dngPath: string, rois: Roi[]): LinearRgb[];
}
