#include "DngPipeline.hpp"

#include "MedianCut.hpp"

#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <stdexcept>
#include <vector>

namespace dngdecoder {

namespace {

// The channel (0=R, 1=G, 2=B) at absolute pixel (x, y) given the 2×2 CFA.
inline uint8_t channelAt(const CfaPattern& cfa, uint32_t x, uint32_t y) {
  return cfa[y & 1u][x & 1u];
}

// Reflect out-of-bounds coords back into [0, dim). Used for the ROI margin
// when the requested rectangle sits within one pixel of an image edge —
// simpler than clamping, and demosaic quality here is dominated by the
// large-area averaging step, not edge treatment.
inline uint32_t mirror(int32_t v, uint32_t dim) {
  if (v < 0) v = -v;
  const int32_t d = static_cast<int32_t>(dim);
  if (v >= d) v = 2 * (d - 1) - v;
  if (v < 0) v = 0;
  if (v >= d) v = d - 1;
  return static_cast<uint32_t>(v);
}

// D50 sRGB reference XYZ→RGB isn't used directly; we compose XYZ→sensor
// (from ColorMatrix1) via inversion into sensor→XYZ→sRGB.
// The D65 XYZ→linear-sRGB matrix (Bradford, standard).
constexpr std::array<double, 9> XYZ_D65_TO_SRGB_LINEAR{
    3.2404542, -1.5371385, -0.4985314,  //
    -0.9692660, 1.8760108, 0.0415560,   //
    0.0556434, -0.2040259, 1.0572252};

// Bradford chromatic adaptation XYZ_D50 → XYZ_D65. Applied only when
// the ForwardMatrix path is used (which produces XYZ_D50 per DNG spec).
// The ColorMatrix-inversion path already produces XYZ_D65-adjacent
// values since the illuminants match (CM2 = XYZ_D65 → sensor).
constexpr std::array<double, 9> BRADFORD_D50_TO_D65{
    0.9555766, -0.0230393, 0.0631636,  //
    -0.0282895, 1.0099416, 0.0210077,  //
    0.0122982, -0.0204830, 1.3299098};

// Invert a 3x3 double-precision matrix; throws on singular.
std::array<double, 9> invert3x3(const std::array<double, 9>& m) {
  const double a = m[0], b = m[1], c = m[2];
  const double d = m[3], e = m[4], f = m[5];
  const double g = m[6], h = m[7], i = m[8];
  const double A = e * i - f * h;
  const double B = -(d * i - f * g);
  const double C = d * h - e * g;
  const double D = -(b * i - c * h);
  const double E = a * i - c * g;
  const double F = -(a * h - b * g);
  const double G = b * f - c * e;
  const double H = -(a * f - c * d);
  const double I = a * e - b * d;
  const double det = a * A + b * B + c * C;
  if (std::abs(det) < 1e-12) {
    throw std::runtime_error("DNG pipeline: singular color matrix");
  }
  const double inv = 1.0 / det;
  return {A * inv, D * inv, G * inv,  //
          B * inv, E * inv, H * inv,  //
          C * inv, F * inv, I * inv};
}

// 3×3 matrix times 3-vector.
inline std::array<double, 3> matVec(const std::array<double, 9>& m,
                                    const std::array<double, 3>& v) {
  return {
      m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
      m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
      m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  };
}

// Bilinear demosaic of a single pixel. Reads a 3×3 neighborhood; the caller
// guarantees x, y are valid for the underlying image (we mirror at edges).
//
// Bayer neighborhoods have three cases:
//   - Red pixel:   G = avg of 4 neighbors, B = avg of 4 diagonals
//   - Blue pixel:  G = avg of 4 neighbors, R = avg of 4 diagonals
//   - Green pixel: R = avg of 2 horiz OR vert R neighbors,
//                  B = avg of 2 vert OR horiz B neighbors
//                  (depends on which green — G in R-row or G in B-row)
//
// We sample the raw pixel data with black-level subtraction and white-level
// normalization applied per-channel before demosaic combines them.
std::array<double, 3> demosaicOne(const ParsedDng& dng, uint32_t x, uint32_t y) {
  auto raw = [&](int32_t dx, int32_t dy) -> double {
    const uint32_t sx = mirror(int32_t(x) + dx, dng.width);
    const uint32_t sy = mirror(int32_t(y) + dy, dng.height);
    const double v = dng.pixels[size_t(sy) * dng.width + sx];
    const uint8_t c = channelAt(dng.cfa, sx, sy);
    const double bl = dng.blackLevel[c];
    const double range = dng.whiteLevel - bl;
    if (range <= 0.0) return 0.0;
    const double n = (v - bl) / range;
    return n < 0.0 ? 0.0 : (n > 1.0 ? 1.0 : n);
  };

  const uint8_t self = channelAt(dng.cfa, x, y);
  std::array<double, 3> rgb{0, 0, 0};

  if (self == 0 || self == 2) {
    // R or B: opposite from diagonals, G from N/S/E/W.
    rgb[self] = raw(0, 0);
    const uint8_t opp = self == 0 ? 2 : 0;
    rgb[opp] =
        (raw(-1, -1) + raw(1, -1) + raw(-1, 1) + raw(1, 1)) * 0.25;
    rgb[1] = (raw(0, -1) + raw(0, 1) + raw(-1, 0) + raw(1, 0)) * 0.25;
  } else {
    // Green: horizontal neighbors are one color, vertical the other.
    // Which is which depends on whether this G is in a Red row or Blue row.
    rgb[1] = raw(0, 0);
    const uint8_t left = channelAt(dng.cfa, mirror(int32_t(x) - 1, dng.width), y);
    // `left` is either R or B; the same channel is the horizontal neighbor.
    const uint8_t horiz = left;                    // R or B
    const uint8_t vert = (horiz == 0) ? 2 : 0;
    rgb[horiz] = (raw(-1, 0) + raw(1, 0)) * 0.5;
    rgb[vert] = (raw(0, -1) + raw(0, 1)) * 0.5;
  }

  return rgb;
}

}  // namespace

namespace {

// Convert an ROI expressed in the DNG's display-orientation coord
// space (matching what renderPreviewRgba emits) back to sensor-native
// coords for reading pixels. Mirror of the write-side rotation in
// renderPreviewRgba. The caller (JS side) picks ROIs on the preview,
// which is post-rotation AND post-crop; the decoder reads the sensor
// RAW, which is pre-rotation. Without this, ROIs land in the wrong
// sensor pixels whenever orientation != 1.
//
// crop = the rect on the sensor that the preview represents (from
// ParsedDng::cropRect). Rotation math uses crop.w/crop.h; then we add
// crop.x/crop.y to translate to full-sensor coords.
RoiPx rotateRoiToSensor(const RoiPx& roi, uint16_t orientation,
                        const CropRect& crop) {
  RoiPx r;
  switch (orientation) {
    case 3:  // 180°: display(x, y) = landscape(crop.w-1-x, crop.h-1-y)
      r = {crop.w - roi.x - roi.w, crop.h - roi.y - roi.h, roi.w, roi.h};
      break;
    case 6:  // 90° CW to display: landscape(x, y) → display(crop.h-1-y, x)
      // Inverse pixel mapping: display(px, py) reads landscape(py, crop.h-1-px)
      // For a display-space ROI (rx, ry, rw, rh), the covered landscape
      // rectangle is landscape.x = ry, landscape.y = crop.h-rx-rw, and
      // widths swap.
      r = {roi.y, crop.h - roi.x - roi.w, roi.h, roi.w};
      break;
    case 8:  // 90° CCW to display: landscape(x, y) → display(y, crop.w-1-x)
      // Inverse: display(px, py) reads landscape(crop.w-1-py, px). ROI covers
      // landscape.x = crop.w-ry-rh, landscape.y = rx.
      r = {crop.w - roi.y - roi.h, roi.x, roi.h, roi.w};
      break;
    case 1:
    default:
      r = roi;
      break;
  }
  // Translate from crop-local to full-sensor coords.
  r.x += crop.x;
  r.y += crop.y;
  return r;
}

}  // namespace

LinearRgbF decodeRoi(const ParsedDng& dng, const RoiPx& roiIn) {
  if (roiIn.w == 0 || roiIn.h == 0) {
    throw std::runtime_error("DNG pipeline: empty ROI");
  }
  const RoiPx roi =
      rotateRoiToSensor(roiIn, dng.orientation, dng.cropRect);
  if (roi.x + roi.w > dng.width || roi.y + roi.h > dng.height) {
    throw std::runtime_error("DNG pipeline: ROI out of image bounds");
  }

  std::array<double, 3> sum{0, 0, 0};
  const uint64_t total = uint64_t(roi.w) * roi.h;

  if (dng.layout == PixelLayout::LinearRaw) {
    // ProRAW / LinearRaw: 3 samples per pixel, interleaved RGB, already
    // demosaiced. Just read + black-level-subtract + normalize + sum.
    // Note: the "sensor RGB" here is Apple's ISP output — Deep Fusion,
    // Smart HDR, and tone mapping are baked in. The subsequent
    // AsShotNeutral divide + ColorMatrix1 transform still applies since
    // Apple emits standard DNG color-transform metadata.
    const size_t rowStride = size_t(dng.width) * 3;
    for (uint32_t j = 0; j < roi.h; ++j) {
      const size_t rowBase = size_t(roi.y + j) * rowStride;
      for (uint32_t i = 0; i < roi.w; ++i) {
        const size_t pxBase = rowBase + size_t(roi.x + i) * 3;
        for (int c = 0; c < 3; ++c) {
          const double v = dng.pixels[pxBase + size_t(c)];
          const double bl = dng.blackLevel[c];
          const double range = dng.whiteLevel - bl;
          if (range <= 0.0) continue;
          const double n = (v - bl) / range;
          sum[c] += (n < 0.0 ? 0.0 : (n > 1.0 ? 1.0 : n));
        }
      }
    }
  } else {
    // CFA/Bayer: demosaic each pixel, then average.
    // Every-other-pixel sub-sampling would be faster and still statistically
    // equivalent for 100×100 patches, but a full pass is straightforward
    // and <5 ms.
    for (uint32_t j = 0; j < roi.h; ++j) {
      for (uint32_t i = 0; i < roi.w; ++i) {
        const auto p = demosaicOne(dng, roi.x + i, roi.y + j);
        sum[0] += p[0];
        sum[1] += p[1];
        sum[2] += p[2];
      }
    }
  }

  std::array<double, 3> sensor{sum[0] / total, sum[1] / total, sum[2] / total};

  // White-balance: AsShotNeutral gives the sensor-RGB of a neutral gray
  // patch in this scene. Divide to normalize gray to (1,1,1).
  for (int c = 0; c < 3; ++c) {
    const double n = dng.asShotNeutral[c];
    if (n > 0) sensor[c] /= n;
  }

  // Sensor → XYZ. When ForwardMatrix2 is present (universal on modern
  // phone DNGs) that IS the canonical sensor→XYZ_D50 transform per
  // DNG spec; use it directly rather than inverting ColorMatrix
  // (which is XYZ→sensor, only invertible-to-sensor→XYZ when the
  // illuminants line up perfectly, which they don't).
  //
  // For Google Pixel DNGs specifically, ColorMatrix2 is authored as
  // the standard XYZ_D65→sRGB matrix — inverting it and re-multiplying
  // by XYZ_D65→sRGB collapses to identity, treating sensor RGB as
  // sRGB-linear directly. That's demonstrably wrong (matches our
  // earlier symptom: near-neutral output on saturated post-its where
  // rawpy produces proper hues).
  std::array<double, 3> xyz;
  if (dng.hasForwardMatrix2) {
    // FM2 outputs XYZ_D50; adapt to D65 before the standard sRGB matrix.
    const std::array<double, 3> xyz_d50 =
        matVec(dng.forwardMatrix2, sensor);
    xyz = matVec(BRADFORD_D50_TO_D65, xyz_d50);
  } else {
    // Fallback: invert ColorMatrix (prefer CM2 over CM1 to match D65).
    const auto& cmatrix =
        dng.hasColorMatrix2 ? dng.colorMatrix2 : dng.colorMatrix1;
    const auto sensorToXyz = invert3x3(cmatrix);
    xyz = matVec(sensorToXyz, sensor);
  }
  const std::array<double, 3> srgb = matVec(XYZ_D65_TO_SRGB_LINEAR, xyz);

  // Clamp to [0, 1]. Well-lit soil samples land comfortably inside; blown
  // highlights outside are unphysical for the downstream Munsell match.
  LinearRgbF out{
      std::clamp(srgb[0], 0.0, 1.0),
      std::clamp(srgb[1], 0.0, 1.0),
      std::clamp(srgb[2], 0.0, 1.0),
  };
  return out;
}

namespace {

// Apply the sensor→linear-sRGB colour pipeline to an already-averaged
// (or per-pixel) sensor triple. Extracted from decodeRoi so
// decodeRoiReduced can call it PER PIXEL — median-cut needs each
// individual pixel in linear-sRGB space, not just the mean.
LinearRgbF sensorToLinearSrgb(const ParsedDng& dng,
                              std::array<double, 3> sensor) {
  for (int c = 0; c < 3; ++c) {
    const double n = dng.asShotNeutral[c];
    if (n > 0) sensor[c] /= n;
  }
  std::array<double, 3> xyz;
  if (dng.hasForwardMatrix2) {
    const std::array<double, 3> xyz_d50 =
        matVec(dng.forwardMatrix2, sensor);
    xyz = matVec(BRADFORD_D50_TO_D65, xyz_d50);
  } else {
    const auto& cmatrix =
        dng.hasColorMatrix2 ? dng.colorMatrix2 : dng.colorMatrix1;
    const auto sensorToXyz = invert3x3(cmatrix);
    xyz = matVec(sensorToXyz, sensor);
  }
  const std::array<double, 3> srgb = matVec(XYZ_D65_TO_SRGB_LINEAR, xyz);
  return {
      std::clamp(srgb[0], 0.0, 1.0),
      std::clamp(srgb[1], 0.0, 1.0),
      std::clamp(srgb[2], 0.0, 1.0),
  };
}

// Read one sensor pixel and normalise (deblack + range-scale) — no
// colour pipeline yet. Returns a sensor-space triple.
// For LinearRaw the pixel is already 3-channel; for CFA we demosaic.
std::array<double, 3> readSensorPixel(const ParsedDng& dng,
                                      uint32_t x, uint32_t y) {
  std::array<double, 3> s{0, 0, 0};
  if (dng.layout == PixelLayout::LinearRaw) {
    const size_t base = size_t(y) * size_t(dng.width) * 3 + size_t(x) * 3;
    for (int c = 0; c < 3; ++c) {
      const double v = dng.pixels[base + size_t(c)];
      const double bl = dng.blackLevel[c];
      const double range = dng.whiteLevel - bl;
      if (range <= 0.0) continue;
      const double n = (v - bl) / range;
      s[c] = (n < 0.0 ? 0.0 : (n > 1.0 ? 1.0 : n));
    }
  } else {
    s = demosaicOne(dng, x, y);
  }
  return s;
}

}  // namespace

RoiReduced decodeRoiReduced(const ParsedDng& dng, const RoiPx& roiIn) {
  if (roiIn.w == 0 || roiIn.h == 0) {
    throw std::runtime_error("DNG pipeline: empty ROI");
  }
  const RoiPx roi =
      rotateRoiToSensor(roiIn, dng.orientation, dng.cropRect);
  if (roi.x + roi.w > dng.width || roi.y + roi.h > dng.height) {
    throw std::runtime_error("DNG pipeline: ROI out of image bounds");
  }

  // Three accumulators:
  //   sensorSum       — sensor-space sum for the mean (matches
  //                     decodeRoi's math exactly).
  //   pixels          — per-pixel linear-sRGB values for the
  //                     median-cut dominant.
  //   linearSum,
  //   linearSumSq     — running sum + sum-of-squares of the already-
  //                     pipelined per-pixel linear-sRGB triples, for
  //                     computing per-channel variance in the linear-
  //                     sRGB space (E[X²] − E[X]²). Same streaming
  //                     formula the live evenness overlay uses on the
  //                     Y plane; see the RoiReduced doc comment for
  //                     why callers care.
  std::array<double, 3> sensorSum{0, 0, 0};
  std::array<double, 3> linearSum{0, 0, 0};
  std::array<double, 3> linearSumSq{0, 0, 0};
  const uint64_t total = uint64_t(roi.w) * roi.h;
  std::vector<LinearRgbF> pixels;
  pixels.reserve(size_t(total));

  for (uint32_t j = 0; j < roi.h; ++j) {
    for (uint32_t i = 0; i < roi.w; ++i) {
      const auto s = readSensorPixel(dng, roi.x + i, roi.y + j);
      sensorSum[0] += s[0];
      sensorSum[1] += s[1];
      sensorSum[2] += s[2];
      const LinearRgbF lin = sensorToLinearSrgb(dng, s);
      pixels.push_back(lin);
      linearSum[0] += lin.r;
      linearSum[1] += lin.g;
      linearSum[2] += lin.b;
      linearSumSq[0] += lin.r * lin.r;
      linearSumSq[1] += lin.g * lin.g;
      linearSumSq[2] += lin.b * lin.b;
    }
  }

  // Mean via the classic per-ROI pipeline pass (single matrix apply on
  // the sensor-averaged triple) — byte-for-byte matches decodeRoi so
  // callers using either function agree.
  const std::array<double, 3> sensorAvg{
      sensorSum[0] / total, sensorSum[1] / total, sensorSum[2] / total};
  const LinearRgbF mean = sensorToLinearSrgb(dng, sensorAvg);

  // Dominant via median-cut on the already-pipelined per-pixel values.
  const LinearRgbF dominant = dominantLinearRgb(pixels);

  // Per-channel variance over the linear-sRGB per-pixel triples.
  // Using the linear-sRGB stream (rather than sensor-native) means the
  // number is directly comparable to `mean` and `dominant` for
  // downstream code. `max(0, …)` guards against negative round-off on
  // near-uniform ROIs.
  const double invN = 1.0 / static_cast<double>(total);
  const LinearRgbF meanLin{
      linearSum[0] * invN, linearSum[1] * invN, linearSum[2] * invN};
  const LinearRgbF variance{
      std::max(0.0, linearSumSq[0] * invN - meanLin.r * meanLin.r),
      std::max(0.0, linearSumSq[1] * invN - meanLin.g * meanLin.g),
      std::max(0.0, linearSumSq[2] * invN - meanLin.b * meanLin.b),
  };

  return {mean, dominant, variance};
}

namespace {

// sRGB linear -> sRGB gamma-encoded, 0..1 to 0..255. Piecewise curve
// from IEC 61966-2-1; standard formulation used by everything from
// libpng to Photoshop.
inline uint32_t linearToSrgb255Precise(double v) {
  if (v <= 0.0) return 0;
  if (v >= 1.0) return 255;
  const double enc = v <= 0.0031308
                         ? 12.92 * v
                         : 1.055 * std::pow(v, 1.0 / 2.4) - 0.055;
  int32_t i = static_cast<int32_t>(enc * 255.0 + 0.5);
  if (i < 0) i = 0;
  if (i > 255) i = 255;
  return static_cast<uint32_t>(i);
}

// 4097-entry LUT (0..4096 inclusive) driven off a 12-bit quantisation
// of the linear input. Precomputed once at first use; every subsequent
// preview + ROI decode reads it instead of calling std::pow(). Turns
// the ~3M-4M pow() calls per full-frame preview into ~3M-4M memory
// reads → ~10-20× speedup for the gamma step on typical Android
// devices. Quantisation error is ≤ 1/2048 in linear which maps to
// well under 1 sRGB byte for anything above black — good enough for
// display previews AND for the analyzer, which reads raw floats
// directly (not through this LUT).
inline uint8_t makeLutEntry(int i) {
  const double v = static_cast<double>(i) / 4096.0;
  return static_cast<uint8_t>(linearToSrgb255Precise(v));
}
struct SrgbLut {
  std::array<uint8_t, 4097> data;
  SrgbLut() {
    for (int i = 0; i < 4097; ++i) data[i] = makeLutEntry(i);
  }
};
inline const SrgbLut& srgbLut() {
  static const SrgbLut lut;
  return lut;
}
inline uint32_t linearToSrgb255(double v) {
  if (v <= 0.0) return 0;
  if (v >= 1.0) return 255;
  const int idx = static_cast<int>(v * 4096.0);
  return srgbLut().data[idx > 4096 ? 4096 : idx];
}

// Precomputed color-transform state so decodeRoi and renderPreviewRgba
// share the exact same math without recomputing per-ROI/per-tile. The
// matrix is EITHER ForwardMatrix2 (post-adapted D50→D65) or, if FM2 is
// absent, inv(ColorMatrix) — see decodeRoi comments for rationale.
struct ColorTransform {
  std::array<double, 9> sensorToXyzD65;
};
ColorTransform makeColorTransform(const ParsedDng& dng) {
  ColorTransform t;
  if (dng.hasForwardMatrix2) {
    // combined = BRADFORD_D50_TO_D65 * forwardMatrix2
    for (int row = 0; row < 3; ++row) {
      for (int col = 0; col < 3; ++col) {
        double sum = 0;
        for (int k = 0; k < 3; ++k) {
          sum += BRADFORD_D50_TO_D65[row * 3 + k] *
                 dng.forwardMatrix2[k * 3 + col];
        }
        t.sensorToXyzD65[row * 3 + col] = sum;
      }
    }
  } else {
    const auto& cmatrix =
        dng.hasColorMatrix2 ? dng.colorMatrix2 : dng.colorMatrix1;
    t.sensorToXyzD65 = invert3x3(cmatrix);
  }
  return t;
}

// Apply the shared color pipeline (WB + sensor→XYZ→sRGB) to a sensor
// triple and return a gamma-encoded ARGB pixel (0xFFRRGGBB).
inline uint32_t sensorToArgb(
    const std::array<double, 3>& sensorIn,
    const std::array<double, 3>& asShotNeutral,
    const ColorTransform& ct) {
  std::array<double, 3> sensor = sensorIn;
  for (int c = 0; c < 3; ++c) {
    const double n = asShotNeutral[c];
    if (n > 0) sensor[c] /= n;
  }
  const std::array<double, 3> xyz = matVec(ct.sensorToXyzD65, sensor);
  const std::array<double, 3> srgb = matVec(XYZ_D65_TO_SRGB_LINEAR, xyz);
  const uint32_t r = linearToSrgb255(srgb[0]);
  const uint32_t g = linearToSrgb255(srgb[1]);
  const uint32_t b = linearToSrgb255(srgb[2]);
  return 0xFF000000u | (r << 16) | (g << 8) | b;
}

}  // namespace

PreviewRgba renderPreviewRgba(const ParsedDng& dng, uint32_t maxDim) {
  if (dng.width == 0 || dng.height == 0) {
    throw std::runtime_error("renderPreviewRgba: empty image");
  }
  if (maxDim < 16) {
    throw std::runtime_error("renderPreviewRgba: maxDim too small");
  }
  const auto tStart = std::chrono::steady_clock::now();

  // Intermediate (sensor-oriented) output dimensions. Scale the larger
  // side of the CROP rect to maxDim, preserve aspect. Iteration bounds
  // and pixel indexing are cropped to dng.cropRect so the preview shows
  // the same "intended visible area" as the HAL's YUV/Preview streams
  // (which may be distortion-corrected and inset from the full sensor).
  // On DNGs without crop tags, cropRect defaults to the full image and
  // this is a no-op.
  const CropRect& crop = dng.cropRect;
  const uint32_t largerSide = std::max(crop.w, crop.h);
  const double scaleD = static_cast<double>(largerSide) / static_cast<double>(maxDim);
  const uint32_t scale = std::max(1u, static_cast<uint32_t>(scaleD));
  const uint32_t midW = std::max(1u, crop.w / scale);
  const uint32_t midH = std::max(1u, crop.h / scale);

  // Post-rotation output dims. Orientations 5–8 all swap axes; 1–4 keep
  // them. Only 1, 3, 6, 8 are seen in practice from phone cameras; 2/4/5/7
  // are the mirrored variants and phones don't emit them.
  const bool swapAxes =
      dng.orientation == 5 || dng.orientation == 6 || dng.orientation == 7 ||
      dng.orientation == 8;
  const uint32_t outW = swapAxes ? midH : midW;
  const uint32_t outH = swapAxes ? midW : midH;

  PreviewRgba out;
  out.width = outW;
  out.height = outH;
  out.argb.assign(size_t(outW) * outH, 0xFF000000u);

  const ColorTransform ct = makeColorTransform(dng);

  // Sub-sample within each sensor block when the block is large.
  // For a 4032×3024 sensor scaled to a 1200-max preview, scale=3, so
  // each block is 3×3 = 9 samples; iterate all. For a 4032×3024 scaled
  // to a 500-max preview, scale=8 → 64 samples/block; stride=2 cuts
  // that to 16, still smooth enough for a preview thumbnail. For CFA
  // we always keep stride=1: the Bayer pattern needs a stride that
  // preserves both parities of both axes, otherwise we'd miss a whole
  // color channel.
  const uint32_t subsampleStride =
      (dng.layout == PixelLayout::LinearRaw && scale >= 4) ? 2u : 1u;

  // Iterate crop-space blocks (mx, my) and write each computed ARGB
  // pixel to its rotated position in the output buffer. Sensor pixel
  // coords are (crop.x + mx*scale + dx, crop.y + my*scale + dy) so we
  // always read from within the visible crop area of the sensor.
  // Single pass, no double-buffer.
  for (uint32_t my = 0; my < midH; ++my) {
    const uint32_t y0 = crop.y + my * scale;
    const uint32_t y1 = std::min(crop.y + crop.h, y0 + scale);
    for (uint32_t mx = 0; mx < midW; ++mx) {
      const uint32_t x0 = crop.x + mx * scale;
      const uint32_t x1 = std::min(crop.x + crop.w, x0 + scale);

      std::array<double, 3> chSum{0, 0, 0};
      std::array<uint32_t, 3> chCount{0, 0, 0};

      if (dng.layout == PixelLayout::LinearRaw) {
        // 3 samples per pixel already; average each channel over the
        // block.
        const size_t rowStride = size_t(dng.width) * 3;
        for (uint32_t y = y0; y < y1; y += subsampleStride) {
          const size_t rowBase = size_t(y) * rowStride;
          for (uint32_t x = x0; x < x1; x += subsampleStride) {
            const size_t pxBase = rowBase + size_t(x) * 3;
            for (int c = 0; c < 3; ++c) {
              const double v = dng.pixels[pxBase + size_t(c)];
              const double bl = dng.blackLevel[c];
              const double range = dng.whiteLevel - bl;
              if (range <= 0.0) continue;
              double n = (v - bl) / range;
              if (n < 0.0) n = 0.0;
              else if (n > 1.0) n = 1.0;
              chSum[c] += n;
              chCount[c] += 1;
            }
          }
        }
      } else {
        // CFA: each sensor sample belongs to one channel based on its
        // CFA position. Averaging separately handles demosaic:
        // R and B each get ~scale²/4 samples, G ~scale²/2.
        for (uint32_t y = y0; y < y1; ++y) {
          for (uint32_t x = x0; x < x1; ++x) {
            const uint8_t c = channelAt(dng.cfa, x, y);
            const double v = dng.pixels[size_t(y) * dng.width + x];
            const double bl = dng.blackLevel[c];
            const double range = dng.whiteLevel - bl;
            if (range <= 0.0) continue;
            double n = (v - bl) / range;
            if (n < 0.0) n = 0.0;
            else if (n > 1.0) n = 1.0;
            chSum[c] += n;
            chCount[c] += 1;
          }
        }
      }

      const std::array<double, 3> sensor{
          chCount[0] > 0 ? chSum[0] / chCount[0] : 0.0,
          chCount[1] > 0 ? chSum[1] / chCount[1] : 0.0,
          chCount[2] > 0 ? chSum[2] / chCount[2] : 0.0,
      };
      const uint32_t argb = sensorToArgb(sensor, dng.asShotNeutral, ct);

      // Rotate (mx, my) → (ox, oy) per TIFF Orientation. See the
      // "TIFF/EP orientations" quick-reference: 1 = no rotation,
      // 3 = 180°, 6 = rotate 90° CW to display (source top-right →
      // display top-left), 8 = rotate 90° CCW. The mirrored variants
      // (2, 4, 5, 7) aren't emitted by phone cameras; fall through as
      // identity.
      uint32_t ox, oy;
      switch (dng.orientation) {
        case 3:
          ox = midW - 1 - mx;
          oy = midH - 1 - my;
          break;
        case 6:
          ox = midH - 1 - my;
          oy = mx;
          break;
        case 8:
          ox = my;
          oy = midW - 1 - mx;
          break;
        case 1:
        default:
          ox = mx;
          oy = my;
          break;
      }
      out.argb[size_t(oy) * outW + ox] = argb;
    }
  }
  const auto tEnd = std::chrono::steady_clock::now();
  const auto ms =
      std::chrono::duration_cast<std::chrono::milliseconds>(tEnd - tStart)
          .count();
  std::fprintf(
      stderr,
      "[DngPipeline] renderPreviewRgba: maxDim=%u out=%ux%u scale=%u "
      "sensor=%ux%u layout=%s stride=%u %lldms\n",
      maxDim, outW, outH, scale, dng.width, dng.height,
      dng.layout == PixelLayout::LinearRaw ? "LinearRaw" : "CFA",
      subsampleStride, static_cast<long long>(ms));
  return out;
}

}  // namespace dngdecoder
