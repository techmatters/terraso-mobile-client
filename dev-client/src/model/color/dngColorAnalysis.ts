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

import {DngDecoderHybrid} from 'dng-decoder';

import {predictColorFromLinear} from 'terraso-mobile-client/model/color/colorDetection';
import {ColorResult} from 'terraso-mobile-client/model/color/types';
import type {LinearRgb} from 'terraso-mobile-client/model/rawColor/types';

export type DngMeasurementArgs = {
  dngUri: string;
  referenceRoi: FractionalRoi;
  soilRoi: FractionalRoi;
};

/** Fractional rect (0..1) of a crop within the display photo. */
export type FractionalRoi = {x: number; y: number; w: number; h: number};

// Map a fractional ROI (0..1 in the upright/portrait display frame) to DNG
// sensor pixel coords. readMetadata returns pre-orientation (landscape) dims,
// so the short side is the display width and the long side is the display
// height — matching roiToPixels in rawColorCamera.tsx, which is the coordinate
// convention decodeDngRois expects. NOTE: assumes a portrait sensor-aspect
// capture (how the app's own captures and iPhone/Pixel DNGs come through); a
// landscape loaded DNG would need its orientation reflected here.
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
 * robust to off-tone flecks in the ROI. Throws if the native decoder can't read
 * the DNG (e.g. Android compressed/tiled strips); callers surface that as a hard
 * failure rather than falling back to the preview JPEG.
 *
 * Shared by the home-screen result and the explainer so both read the same raw
 * measurement.
 */
export const measuredLinearFromDng = async ({
  dngUri,
  referenceRoi,
  soilRoi,
}: DngMeasurementArgs): Promise<{reference: LinearRgb; soil: LinearRgb}> => {
  const {width, height} = await DngDecoderHybrid.readMetadata(dngUri);
  const reduced = await DngDecoderHybrid.decodeDngRoisReduced(dngUri, [
    roiToSensorPixels(referenceRoi, width, height),
    roiToSensorPixels(soilRoi, width, height),
  ]);
  return {reference: reduced[0].dominant, soil: reduced[1].dominant};
};

/** DNG path of the unified analysis. */
export const getColorFromDng = async ({
  expected,
  ...args
}: DngMeasurementArgs & {expected: LinearRgb}): Promise<ColorResult> => {
  const {reference, soil} = await measuredLinearFromDng(args);
  return predictColorFromLinear(reference, soil, expected);
};
