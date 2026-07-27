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

export type PreviewImage = {
  uri: string;
  width: number;
  height: number;
};

export interface DngDecoder
  extends HybridObject<{ios: 'swift'; android: 'kotlin'}> {
  readMetadata(dngPath: string): DngMetadata;

  decodeDngRois(dngPath: string, rois: Roi[]): LinearRgb[];

  /**
   * Render the DNG to a display-friendly PNG file for use as a preview in
   * ROI-picker UI. The PNG is written to a temp path; caller should not
   * assume long-term persistence. `maxDim` is the largest allowed
   * width/height in pixels; the renderer scales down to fit while
   * preserving aspect ratio.
   */
  renderPreview(dngPath: string, maxDim: number): PreviewImage;
}
