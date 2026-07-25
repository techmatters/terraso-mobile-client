// Minimal DNG (TIFF-based) parser.
//
// Reads just the tags needed by the phase-3 color pipeline: CFA layout,
// sensor black/white levels, per-channel WB, XYZ->camera color matrix,
// and the raw Bayer pixel data.
//
// See docs/raw-camera-plan.md phase 3. Scope: uncompressed 10/12/14/16-bit
// Bayer DNGs as written by react-native-vision-camera v5 on iOS and Android.
// Non-Bayer (Fujifilm X-Trans etc.), compressed strips, and tiled layouts
// are out of scope — the mobile client only handles Bayer sensors.

#pragma once

#include <array>
#include <cstdint>
#include <string>
#include <vector>

namespace dngdecoder {

// 2×2 Bayer layout. Values: 0 = Red, 1 = Green, 2 = Blue.
// Row-major: pattern[row][col].
using CfaPattern = std::array<std::array<uint8_t, 2>, 2>;

struct ParsedDng {
  uint32_t width{0};
  uint32_t height{0};
  uint16_t bitsPerSample{16};

  CfaPattern cfa{{{0, 1}, {1, 2}}};  // default RGGB

  // Per-channel; index 0=R, 1=G, 2=B.
  std::array<double, 3> blackLevel{0.0, 0.0, 0.0};
  double whiteLevel{65535.0};

  // Camera-neutral in sensor RGB. Reciprocals of the WB gains.
  std::array<double, 3> asShotNeutral{1.0, 1.0, 1.0};

  // Row-major 3x3, XYZ (D65) -> sensor RGB.
  std::array<double, 9> colorMatrix1{
      1, 0, 0,  //
      0, 1, 0,  //
      0, 0, 1};

  // Raw sensor samples, row-major, width*height elements.
  // Always widened to uint16 regardless of bitsPerSample; unused MSBs are 0.
  std::vector<uint16_t> pixels;
};

// Parse a DNG file from disk. Throws std::runtime_error on malformed input
// or unsupported features (compressed data, non-CFA image, missing tags).
ParsedDng parseDng(const std::string& path);

}  // namespace dngdecoder
