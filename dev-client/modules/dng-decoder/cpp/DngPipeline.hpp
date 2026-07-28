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

// Sub-sampled preview render. Produces an ARGB8888 buffer (each
// uint32_t = 0xFF__RRGGBB) suitable for direct Bitmap.ARGB_8888
// consumption on Android. Aspect ratio preserved; larger sensor
// dimension is scaled to at most `maxDim` output pixels.
//
// Sub-sampling by block-averaging keeps memory + CPU bounded on a
// 12-24MP sensor. For each output pixel we average all covered CFA
// samples per channel (naturally handling demosaic — R and B each
// come from ~scale²/4 samples, G from ~scale²/2). LinearRaw is
// simpler: 3-per-pixel means we average all 3 channels together
// over the block.
//
// The color pipeline (black-level, AsShotNeutral WB, ColorMatrix1
// inversion → XYZ → sRGB linear + gamma encoding) matches
// decodeRoi. Output is display-sRGB byte range, ready for PNG
// encoding without further processing.
struct PreviewRgba {
  uint32_t width;
  uint32_t height;
  std::vector<uint32_t> argb;  // width * height, 0xFFRRGGBB per pixel
};
PreviewRgba renderPreviewRgba(const ParsedDng& dng, uint32_t maxDim);

}  // namespace dngdecoder
