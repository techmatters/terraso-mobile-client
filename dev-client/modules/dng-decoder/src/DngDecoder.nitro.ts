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

export type PreviewRgb = {
  width: number;
  height: number;
  // Row-major interleaved RGB bytes, 3 per pixel (no alpha, no padding).
  // Length = width * height * 3. Rendered through CIRAWFilter in
  // gamma-encoded sRGB — same numeric convention as readPreviewGrayscale
  // — so CV thresholds picked on eyeballed screenshots apply directly.
  // Callers that need chromaticity in addition to luminance (e.g. the
  // Munsell chart validator's white-mask stage) use this instead of the
  // grayscale variant.
  pixels: ArrayBuffer;
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

  /**
   * Same as readPreviewGrayscale but returns interleaved RGB bytes
   * (3 per pixel). Used by CV that needs chromaticity in addition to
   * luminance — currently the Munsell chart validator's white-mask
   * stage, which needs to distinguish paper-white from off-white chart
   * body based on chroma, not just brightness.
   */
  readPreviewRgb(dngPath: string, maxDim: number): PreviewRgb;

  /**
   * Photo-file (JPEG / HEIC / PNG) variant of readPreviewRgb. Loads
   * the file via CIImage (no CIRAWFilter) and renders through the
   * same linear-sRGB working space, so the caller receives the same
   * shape of data as the RAW path. Lets the Munsell chart validator
   * work from ordinary phone photos as well as DNGs when a RAW isn't
   * available — with the caveat that photo pixels have already been
   * WB-corrected and tone-curved by Apple's ISP, so downstream WB
   * correction is applied on top of Apple's decisions.
   */
  readPreviewRgbPhoto(imagePath: string, maxDim: number): PreviewRgb;

  /**
   * Photo-file variant of decodeDngRois. Loads via CIImage, renders
   * in linear-sRGB working space; same output convention as the RAW
   * variant. Same photo-pipeline caveat as readPreviewRgbPhoto.
   */
  decodePhotoRois(imagePath: string, rois: Roi[]): LinearRgb[];
}
