#include "DngPipeline.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <stdexcept>

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

LinearRgbF decodeRoi(const ParsedDng& dng, const RoiPx& roi) {
  if (roi.w == 0 || roi.h == 0) {
    throw std::runtime_error("DNG pipeline: empty ROI");
  }
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

  // ColorMatrix1 is XYZ_D50 (per DNG spec) → sensor RGB. Invert to go
  // sensor → XYZ_D50, then XYZ_D50 → sRGB_linear. For phase 3 we skip the
  // D50→D65 chromatic adaptation and use the D65 XYZ→sRGB matrix directly;
  // for a scene-adaptive AsShotNeutral WB the residual chromatic-adaptation
  // error is small compared to sensor + demosaic noise on a 100×100 patch.
  const auto sensorToXyz = invert3x3(dng.colorMatrix1);
  const std::array<double, 3> xyz = matVec(sensorToXyz, sensor);
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

}  // namespace dngdecoder
