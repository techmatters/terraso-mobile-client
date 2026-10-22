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

// A rectangle in sensor-native (pre-rotation) coordinates. Used to
// express the DNG's "intended visible area" from DefaultCropOrigin/Size
// or ActiveArea tags. When absent, defaults to the full image.
struct CropRect {
  uint32_t x{0};
  uint32_t y{0};
  uint32_t w{0};
  uint32_t h{0};
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

  // Intended visible area on the sensor, from DefaultCropOrigin
  // (50719) + DefaultCropSize (50720), or ActiveArea (50829) as
  // fallback. Defaults to (0, 0, width, height) — the whole image —
  // when no crop tags are present. The pipeline (renderPreviewRgba,
  // decodeRoi) honors this rect so callers see only the "canonical"
  // visible area. Rationale: some HAL pipelines (notably Google Pixel)
  // apply lens-distortion correction to YUV/JPEG/Preview streams that
  // crops them inward, but leave RAW captures at the full sensor
  // extent. The DNG's crop tags describe where the visible area sits
  // in the RAW; honoring them keeps the on-screen preview and the
  // decoded RAW in the same coordinate system (WYSIWYG).
  CropRect cropRect;

  // Only meaningful when layout == Cfa.
  CfaPattern cfa{{{0, 1}, {1, 2}}};  // default RGGB

  // Per-channel; index 0=R, 1=G, 2=B.
  std::array<double, 3> blackLevel{0.0, 0.0, 0.0};
  double whiteLevel{65535.0};

  // Camera-neutral in sensor RGB. Reciprocals of the WB gains.
  // Present in ProRAW files but Apple has already applied its WB (this
  // triple is close to (1,1,1) but not exactly). Kept for completeness.
  std::array<double, 3> asShotNeutral{1.0, 1.0, 1.0};

  // Row-major 3x3, XYZ -> sensor RGB per DNG spec.
  // ColorMatrix1 is calibrated for CalibrationIlluminant1 (typically
  // Standard Light A / tungsten); ColorMatrix2 for CalibrationIlluminant2
  // (typically D65 / daylight). Modern phones (Pixel, iPhone) always
  // emit both; on Android CameraX-written DNGs the D65 matrix tends to
  // be very close to a standard XYZ_D65 → sRGB_linear identity (i.e.
  // the sensor is calibrated as sRGB-native under D65). Using
  // ColorMatrix1 (tungsten) unconditionally on a daylight/LED scene
  // produces a warm colour bias — the classic wrong-CCT symptom.
  // Pipeline picks CM2 when present; a proper interpolation between
  // the two by AsShotNeutral is deferred future work.
  std::array<double, 9> colorMatrix1{
      1, 0, 0,  //
      0, 1, 0,  //
      0, 0, 1};
  std::array<double, 9> colorMatrix2{
      1, 0, 0,  //
      0, 1, 0,  //
      0, 0, 1};
  bool hasColorMatrix2{false};

  // ForwardMatrix — sensor RGB → XYZ_D50 (per DNG spec). This is the
  // CANONICAL sensor-to-XYZ transform when present; using it beats
  // inverting ColorMatrix because ColorMatrix is calibrated for a
  // specific illuminant white point (D50 or D65) whose inverse gives
  // a subtly wrong sensor→XYZ (the illuminant white-point shift is
  // baked in). Google Pixel DNGs always emit both FM1 (Illum A) and
  // FM2 (D65). Pipeline prefers FM2.
  std::array<double, 9> forwardMatrix2{
      1, 0, 0,  //
      0, 1, 0,  //
      0, 0, 1};
  bool hasForwardMatrix2{false};

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
