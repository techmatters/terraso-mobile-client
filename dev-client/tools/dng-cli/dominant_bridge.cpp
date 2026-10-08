// C ABI bridge so the Swift dng-cli can call the shared C++ median-cut
// dominant-colour reducer (modules/dng-decoder/cpp/MedianCut). This gives
// the analyzer's iOS RAW path the SAME "dominant" as the on-device app
// (HybridDngDecoder.swift → dngDecoderDominantLinearRgb) and the Android
// C++ path — the median-cut runs on the identical linear-sRGB ROI pixels
// the CLI already renders for the mean, so the three paths agree.
//
// Mirrors dngDecoderDominantLinearRgb in DngDecoderC.cpp, but kept as a
// tiny standalone unit so the CLI links only MedianCut (+ its header-only
// LinearRgbF type) and not the whole DNG parser pipeline.

#include "MedianCut.hpp"

#include <cstdint>
#include <vector>

// `rgb` is interleaved R,G,B floats (3*count values) in [0,1] linear
// sRGB. Writes the dominant linear-sRGB triple to outRgb[0..2]. Returns
// false on bad input.
extern "C" bool dngcli_dominant_linear_rgb(const float* rgb, int32_t count,
                                           double* outRgb) {
  if (!rgb || !outRgb || count <= 0) return false;
  std::vector<dngdecoder::LinearRgbF> pixels;
  pixels.reserve(static_cast<size_t>(count));
  for (int32_t i = 0; i < count; ++i) {
    pixels.push_back({static_cast<double>(rgb[i * 3]),
                      static_cast<double>(rgb[i * 3 + 1]),
                      static_cast<double>(rgb[i * 3 + 2])});
  }
  const dngdecoder::LinearRgbF dom = dngdecoder::dominantLinearRgb(pixels);
  outRgb[0] = dom.r;
  outRgb[1] = dom.g;
  outRgb[2] = dom.b;
  return true;
}
