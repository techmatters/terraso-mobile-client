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

// Plain-TypeScript projection of the `dng-decoder` module's public
// surface — same shapes as its Nitro spec but with no react-native-
// nitro-modules dependency, so this file can be imported from Node
// (where the Nitro runtime isn't available).
//
// Consumers pass an implementation of `DngDecoderLike` to
// `analyzeMunsellChart` rather than the module reaching for
// `DngDecoderHybrid` directly. RN screens pass the real
// `DngDecoderHybrid`; the Node fixture runner passes an adapter that
// spawns the standalone `dng-cli` Swift binary.

export type Roi = {x: number; y: number; w: number; h: number};
export type LinearRgb = {r: number; g: number; b: number};

// Dual-reducer per-ROI decode result. `mean` = per-channel arithmetic
// average (biased by highlights + off-tone flecks); `dominant` =
// median-cut posterise "biggest colour cluster" (matches the legacy
// JPEG dominantColor algorithm, robust to a handful of outlier
// pixels). Kept in lockstep with LinearRgbReduced in the Nitro spec.
// `meanUnclamped` is the pre-display-clamp version of `mean` from the
// C++ DNG pipeline (see DngPipeline::sensorToLinearSrgbUnclamped) —
// bright but non-saturated pixels post-WB routinely exceed 1.0, and
// dividing WB anchors by the clamped mean under-corrects every chip.
// Only populated by the mac dng-cli-cpp path; null on iOS Swift and
// on-device Nitro paths, where consumers fall back to `mean`.
export type LinearRgbReduced = {
  mean: LinearRgb;
  dominant: LinearRgb;
  meanUnclamped?: LinearRgb | null;
};
export type PreviewImage = {uri: string; width: number; height: number};
export type PreviewRgb = {
  width: number;
  height: number;
  // Row-major interleaved RGB bytes (3 per pixel, no alpha, no
  // padding). Length = width * height * 3.
  pixels: ArrayBuffer;
  sourceWidth: number;
  sourceHeight: number;
};

export interface DngDecoderLike {
  decodeDngRois(dngPath: string, rois: Roi[]): LinearRgb[];
  decodeDngRoisReduced(dngPath: string, rois: Roi[]): LinearRgbReduced[];
  decodePhotoRois(imagePath: string, rois: Roi[]): LinearRgb[];
  readPreviewRgb(dngPath: string, maxDim: number): PreviewRgb;
  readPreviewRgbPhoto(imagePath: string, maxDim: number): PreviewRgb;
  renderPreview(dngPath: string, maxDim: number): PreviewImage;
}
