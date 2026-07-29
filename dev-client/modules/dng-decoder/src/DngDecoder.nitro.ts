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

export type PreviewGrayscale = {
  width: number;
  height: number;
  // Row-major 8-bit luma bytes. Length = width * height. Values are on
  // the standard 0..255 luma scale (Rec709-ish; near-neutral surfaces
  // sit around their RGB brightness). Used by JS-side CV — thresholding,
  // connected-components, blob shape analysis — where we want raw pixel
  // access without paying for a PNG encode/decode round-trip.
  pixels: ArrayBuffer;
  // Full-resolution source dimensions from CIRAWFilter, before the
  // maxDim downscale. Same coordinate space that decodeDngRois works
  // in — callers use the ratio (sourceWidth / width) etc. to scale
  // preview-space ROIs back up before decoding.
  sourceWidth: number;
  sourceHeight: number;
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

  /**
   * Decode the DNG and return a downscaled grayscale bitmap for
   * JS-side CV (Munsell chart auto-registration). Same
   * scale-to-fit-maxDim behaviour as renderPreview, but skips the PNG
   * step and returns raw luma bytes in an ArrayBuffer.
   */
  readPreviewGrayscale(dngPath: string, maxDim: number): PreviewGrayscale;
}
