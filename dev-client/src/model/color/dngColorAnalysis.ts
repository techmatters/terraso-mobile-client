/*
 * Copyright © 2026 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {ActionCrop, manipulateAsync, SaveFormat} from 'expo-image-manipulator';

import {DngDecoderHybrid} from 'dng-decoder';

import {
  measuredLinearFromJpegCrop,
  predictColorFromLinear,
} from 'terraso-mobile-client/model/color/colorDetection';
import {ColorResult} from 'terraso-mobile-client/model/color/types';
import type {LinearRgb} from 'terraso-mobile-client/model/rawColor/types';

export type DngMeasurementArgs = {
  dngUri: string;
  referenceRoi: FractionalRoi;
  soilRoi: FractionalRoi;
};

/** Fractional rect (0..1) of a crop within the display photo. */
export type FractionalRoi = {x: number; y: number; w: number; h: number};

// Max edge of the throwaway grayscale decode we use only to read the
// CIRAWFilter source dimensions. Tiny — we discard the pixels; we just need
// sourceWidth/sourceHeight.
const DIMS_PROBE_MAX_DIM = 64;

// Map a fractional ROI (0..1 in the upright/portrait display frame) to the
// pixel coords decodeDngRois expects — i.e. CIRAWFilter's oriented output
// space (sourceWidth × sourceHeight from readPreviewGrayscale/Rgb), which the
// native side forces to portrait. The short side is the display width, the
// long side the display height. NOTE: assumes a portrait-aspect capture (how
// the app's own captures and iPhone/Pixel DNGs come through); a landscape
// loaded DNG would need its orientation reflected here.
const roiToSensorPixels = (
  roi: FractionalRoi,
  width: number,
  height: number,
) => {
  const effW = Math.min(width, height);
  const effH = Math.max(width, height);
  return {
    x: Math.round(roi.x * effW),
    y: Math.round(roi.y * effH),
    w: Math.round(roi.w * effW),
    h: Math.round(roi.h * effH),
  };
};

/**
 * Measure the reference and soil crop rectangles straight from the raw sensor
 * data — black-level, demosaic, white-balance (AsShotNeutral) and the camera
 * colour matrix are applied natively, yielding linear-sRGB. This is the whole
 * point of keeping the DNG: the embedded preview JPEG is ISP-cooked and must NOT
 * be the analysis input.
 *
 * `dominant` (median-cut) matches the JPEG path's dominantColor semantics —
 * robust to off-tone flecks in the ROI.
 *
 * Dimensions come from `readPreviewGrayscale` (CIRAWFilter's source extent),
 * NOT `readMetadata`: the latter runs the hand-rolled C++ TIFF parser, which
 * only reads uncompressed, strip-based DNGs and throws on the compressed/tiled
 * DNGs iPhones actually produce. decodeDngRoisReduced crops in CIRAWFilter's
 * oriented extent anyway, so sourceWidth/sourceHeight is both the robust AND
 * the coordinate-correct source of the ROI scale.
 *
 * Shared by the home-screen result and the explainer so both read the same raw
 * measurement.
 */
export const measuredLinearFromDng = async ({
  dngUri,
  referenceRoi,
  soilRoi,
}: DngMeasurementArgs): Promise<{reference: LinearRgb; soil: LinearRgb}> => {
  try {
    const {sourceWidth, sourceHeight} =
      await DngDecoderHybrid.readPreviewGrayscale(dngUri, DIMS_PROBE_MAX_DIM);
    const reduced = await DngDecoderHybrid.decodeDngRoisReduced(dngUri, [
      roiToSensorPixels(referenceRoi, sourceWidth, sourceHeight),
      roiToSensorPixels(soilRoi, sourceWidth, sourceHeight),
    ]);
    return {reference: reduced[0].dominant, soil: reduced[1].dominant};
  } catch (err) {
    // The reduced-ROI decode can fail where renderPreview still succeeds (seen
    // on some device captures). Both run the RAW pipeline (demosaic / WB /
    // colour-matrix), so falling back to a preview-crop dominant keeps the
    // measurement raw-faithful — NOT the ISP companion JPEG — just lower-res.
    console.warn(
      '[dngColorAnalysis] reduced-ROI decode failed, using raw preview crop',
      err,
    );
    return measuredLinearFromDngPreview({dngUri, referenceRoi, soilRoi});
  }
};

// Max edge of the raw-decoded preview used for the fallback measurement. Large
// enough that a cropped ROI still has plenty of pixels for a stable dominant.
const PREVIEW_FALLBACK_MAX_DIM = 1024;

// Dominant linear-sRGB of each ROI measured from the raw-decoded preview (the
// same renderPreview path the dominant-colour editor uses). renderPreview runs
// the camera's RAW pipeline to sRGB, so this is still raw-faithful; we then
// treat the crop like any sRGB JPEG crop (sRGB→linear via dominant).
const measuredLinearFromDngPreview = async ({
  dngUri,
  referenceRoi,
  soilRoi,
}: DngMeasurementArgs): Promise<{reference: LinearRgb; soil: LinearRgb}> => {
  const preview = await DngDecoderHybrid.renderPreview(
    dngUri,
    PREVIEW_FALLBACK_MAX_DIM,
  );
  const cropBase64 = async (roi: FractionalRoi): Promise<string> => {
    const crop: ActionCrop = {
      crop: {
        originX: Math.round(roi.x * preview.width),
        originY: Math.round(roi.y * preview.height),
        width: Math.round(roi.w * preview.width),
        height: Math.round(roi.h * preview.height),
      },
    };
    const out = await manipulateAsync(preview.uri, [crop], {
      base64: true,
      compress: 1.0,
      format: SaveFormat.JPEG,
    });
    if (!out.base64) {
      throw new Error('measuredLinearFromDngPreview: no base64 from crop');
    }
    return out.base64;
  };
  const [refBase64, soilBase64] = await Promise.all([
    cropBase64(referenceRoi),
    cropBase64(soilRoi),
  ]);
  return {
    reference: measuredLinearFromJpegCrop({
      base64: refBase64,
      uri: '',
      width: 0,
      height: 0,
    }),
    soil: measuredLinearFromJpegCrop({
      base64: soilBase64,
      uri: '',
      width: 0,
      height: 0,
    }),
  };
};

/** DNG path of the unified analysis. */
export const getColorFromDng = async ({
  expected,
  ...args
}: DngMeasurementArgs & {expected: LinearRgb}): Promise<ColorResult> => {
  const {reference, soil} = await measuredLinearFromDng(args);
  return predictColorFromLinear(reference, soil, expected);
};
