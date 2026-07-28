// Minimal DNG (TIFF-based) parser.
//
// Reads just the tags needed by the phase-3 color pipeline: CFA layout (or
// LinearRaw layout), sensor black/white levels, per-channel WB, XYZ->camera
// color matrix, and the raw pixel data.
//
// See docs/raw-camera-plan.md phase 3. Scope:
//   - Uncompressed CFA Bayer DNGs (PhotometricInterpretation=32803) as
//     written by react-native-vision-camera v5 on Android CameraX (native
//     resolution) and older iPhone Pros.
//   - Uncompressed LinearRaw DNGs (PhotometricInterpretation=34892) —
//     Apple ProRAW files, where the ISP has already demosaiced into a
//     3-samples-per-pixel chunky RGB layout. Written by vision-camera v5
//     on modern iPhone Pro (iPhone 12 Pro and later) at 4032×3024,
//     because the 48 MP quad-Bayer sensor architecture exposes no plain
//     Bayer path.
//
// Out of scope: Fujifilm X-Trans and other non-Bayer CFA sensors, compressed
// strips (lossless-JPEG, lossy-JPEG DNGs), tiled layouts, PhotometricInter-
// pretation values other than 32803 or 34892.

#pragma once

#include <array>
#include <cstdint>
#include <string>
#include <vector>

namespace dngdecoder {

// 2×2 Bayer layout. Values: 0 = Red, 1 = Green, 2 = Blue.
// Row-major: pattern[row][col]. Not meaningful for LinearRaw.
using CfaPattern = std::array<std::array<uint8_t, 2>, 2>;

enum class PixelLayout : uint8_t {
  // 1 sample per pixel, per-pixel channel = cfa[row & 1][col & 1].
  // The demosaicer in DngPipeline reconstructs full RGB per ROI.
  Cfa = 0,
  // 3 samples per pixel, interleaved RGB (chunky). No demosaic needed.
  // ProRAW's `PhotometricInterpretation = LinearRaw (34892)`.
  LinearRaw = 1,
};

struct ParsedDng {
  uint32_t width{0};
  uint32_t height{0};
  uint16_t bitsPerSample{16};
  PixelLayout layout{PixelLayout::Cfa};

  // TIFF Orientation tag (274). 1 = as-stored (top-left origin);
  // 3 = 180°, 6 = rotate 90° CW to display, 8 = rotate 90° CCW.
  // Android CameraX writes this based on device rotation at capture
  // time; iOS handles it internally in CIRAWFilter. Applied by
  // renderPreviewRgba so the preview shows upright to the user.
  uint16_t orientation{1};

  // Only meaningful when layout == Cfa.
  CfaPattern cfa{{{0, 1}, {1, 2}}};  // default RGGB

  // Per-channel; index 0=R, 1=G, 2=B.
  std::array<double, 3> blackLevel{0.0, 0.0, 0.0};
  double whiteLevel{65535.0};

  // Camera-neutral in sensor RGB. Reciprocals of the WB gains.
  // Present in ProRAW files but Apple has already applied its WB (this
  // triple is close to (1,1,1) but not exactly). Kept for completeness.
  std::array<double, 3> asShotNeutral{1.0, 1.0, 1.0};

  // Row-major 3x3, XYZ (D50) -> sensor RGB per DNG spec. On LinearRaw
  // files the "sensor RGB" is Apple's already-demosaiced linear-ish RGB.
  std::array<double, 9> colorMatrix1{
      1, 0, 0,  //
      0, 1, 0,  //
      0, 0, 1};

  // Pixel data, row-major. Widened to uint16 regardless of bitsPerSample.
  //
  //   layout == Cfa:       width*height elements, 1 sample per pixel
  //   layout == LinearRaw: width*height*3 elements, RGB interleaved
  //
  // The pipeline layer uses `layout` to interpret this correctly.
  std::vector<uint16_t> pixels;
};

// Parse a DNG file from disk. Throws std::runtime_error on malformed input
// or unsupported features (compressed data, non-CFA/non-LinearRaw image,
// missing required tags).
ParsedDng parseDng(const std::string& path);

}  // namespace dngdecoder
