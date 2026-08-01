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

// Shared chart-guide config used by both the capture-time viewfinder
// overlay (RawCameraView.chartGuide prop) and the post-capture debug
// overlay (draws a rectangle where the guide WAS to visualise chart
// placement). Kept in one place so the two can't drift.
//
// aspectW / aspectH: guide box aspect ratio — 4.5" × 7" matches the
// Munsell soil-colour page dimensions.
// marginFrac: fraction of the shorter viewfinder axis kept as empty
// margin around the guide, on the binding axis.
export type ChartGuide = {
  aspectW: number;
  aspectH: number;
  marginFrac: number;
};

export const CHART_GUIDE: ChartGuide = {
  aspectW: 4.5,
  aspectH: 7,
  marginFrac: 0.1,
};

// Compute the guide rectangle in image-pixel coordinates given the
// image dimensions. Mirrors the layout math in ChartGuideOverlay so
// the debug overlay draws the same rectangle the user saw through the
// viewfinder — assuming the image was captured with the same guide
// and its aspect matches the viewfinder's sensor aspect (true for
// in-app DNG / JPEG captures; only approximate for loaded photos of
// arbitrary aspect).
export const computeChartGuideRect = (
  imgW: number,
  imgH: number,
  guide: ChartGuide = CHART_GUIDE,
): {x: number; y: number; w: number; h: number} => {
  const {aspectW, aspectH, marginFrac} = guide;
  const maxW = imgW * (1 - 2 * marginFrac);
  const maxH = imgH * (1 - 2 * marginFrac);
  const boxW = Math.min(maxW, (maxH * aspectW) / aspectH);
  const boxH = (boxW * aspectH) / aspectW;
  return {
    x: (imgW - boxW) / 2,
    y: (imgH - boxH) / 2,
    w: boxW,
    h: boxH,
  };
};
