// Extract an ROI patch from a parsed DNG, bilinear-demosaic it, and
// return an averaged linear-sRGB triple in [0, 1].
//
// The ROI is specified in pixel coordinates on the full-resolution raw
// sensor. Small ROIs (~100×100) are the intended use — averaging a large
// uniform patch of soil or reference-card color.
//
// See docs/raw-camera-plan.md phase 3 for the color pipeline description.

#pragma once

#include "DngParser.hpp"

namespace dngdecoder {

struct RoiPx {
  uint32_t x;  // top-left in raw pixel coordinates
  uint32_t y;
  uint32_t w;
  uint32_t h;
};

struct LinearRgbF {
  double r;
  double g;
  double b;
};

// Decode a single ROI. Averages the demosaiced patch and applies the
// color pipeline once per ROI (rather than per pixel).
LinearRgbF decodeRoi(const ParsedDng& dng, const RoiPx& roi);

}  // namespace dngdecoder
