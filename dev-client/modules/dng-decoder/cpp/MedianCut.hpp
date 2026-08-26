// Modified median-cut quantisation of a linear-sRGB pixel buffer, returning
// the linear-sRGB colour at the centroid of the largest colour cluster.
//
// Semantic match for the production JPEG color-detection algorithm
// (src/model/color/colorDetection.ts `dominantColor`) which uses the
// quantize npm package (Leptonica-style median-cut). Applies the same
// intent: give the tester "the most common colour in the ROI, ignoring a
// few off-tone spots" — as opposed to a plain arithmetic mean, which is
// biased toward specular highlights, cracks, or partial-cover reference
// cards.
//
// Algorithm outline:
//   1. Gamma-encode each linear-sRGB input to sRGB 0..255 (matches the
//      production algorithm, which operates on JPEG-decoded gamma bytes).
//   2. Bin into a 5-bit-per-channel histogram (32³ = 32768 bins).
//   3. Iteratively split the highest-count vbox along its longest axis at
//      the median cumulative count, until N vboxes remain (N=5 to match
//      QUANTIZATION_COLOR_COUNT in colorDetection.ts).
//   4. Sort vboxes by pixel count; centroid the largest → gamma-decode
//      back to linear sRGB and return.

#pragma once

#include "DngPipeline.hpp"

#include <vector>

namespace dngdecoder {

// N = number of vboxes to produce. 5 matches the production
// QUANTIZATION_COLOR_COUNT constant.
constexpr int kMedianCutTargetVBoxes = 5;

// Compute the dominant colour of the given linear-sRGB pixels using the
// 5-vbox median-cut method above.
//
// Empty input returns {0, 0, 0}. Single-pixel input returns that pixel.
// The gamma round-trip introduces up to ~1/255 quantisation error, which
// is negligible for the colour-picker use case.
LinearRgbF dominantLinearRgb(const std::vector<LinearRgbF>& pixels);

}  // namespace dngdecoder
