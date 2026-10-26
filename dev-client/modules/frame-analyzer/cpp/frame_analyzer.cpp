// DUPLICATED (temporarily) from
// modules/raw-camera-android/android/src/main/cpp/frame_analyzer.cpp.
// Consolidate once the iOS overlay lands, per docs/raw-camera-plan.md
// phase 8.4 follow-up.

#include "frame_analyzer.h"

#include <algorithm>

#if defined(__ARM_NEON)
#include <arm_neon.h>
#endif

namespace {

#if defined(__ARM_NEON)
// NEON hot path: accumulate one row's sum and sum-of-squares into u64
// running totals. Uses 16-wide vector loads; scalar tail for widths not
// divisible by 16.
inline void accumRowNeon(
    const uint8_t* row, uint32_t width, uint64_t& sum, uint64_t& sumSq) {
  uint32x4_t sumAcc = vdupq_n_u32(0);
  uint64x2_t sqAcc = vdupq_n_u64(0);

  uint32_t i = 0;
  for (; i + 16 <= width; i += 16) {
    uint8x16_t v = vld1q_u8(row + i);

    // Sum: pairwise-widen u8→u16, then accumulate widened into u32x4.
    // Two vpaddl steps keep each lane well below overflow (u32 lane
    // holds 4B; we're adding at most 255*16 = 4080 per iter, so this
    // survives ~1M iterations per row — orders of magnitude past
    // realistic frame widths).
    sumAcc = vpadalq_u16(sumAcc, vpaddlq_u8(v));

    // Sum-of-squares: u8×u8→u16 for each half, then widen to u32,
    // accumulate into u64x2. Max per-lane addend per iter is 255*255*4
    // = 260k, well within u64.
    uint8x8_t lo = vget_low_u8(v);
    uint8x8_t hi = vget_high_u8(v);
    uint16x8_t sqLo = vmull_u8(lo, lo);
    uint16x8_t sqHi = vmull_u8(hi, hi);
    sqAcc = vpadalq_u32(sqAcc, vpaddlq_u16(sqLo));
    sqAcc = vpadalq_u32(sqAcc, vpaddlq_u16(sqHi));
  }

  // Horizontal reduce SIMD accumulators into the running u64 totals.
  uint32_t sumLanes[4];
  vst1q_u32(sumLanes, sumAcc);
  sum += static_cast<uint64_t>(sumLanes[0]) + sumLanes[1] + sumLanes[2] +
      sumLanes[3];
  uint64_t sqLanes[2];
  vst1q_u64(sqLanes, sqAcc);
  sumSq += sqLanes[0] + sqLanes[1];

  // Scalar tail for the last (width % 16) pixels.
  for (; i < width; ++i) {
    uint32_t p = row[i];
    sum += p;
    sumSq += p * p;
  }
}
#else
inline void accumRowScalar(
    const uint8_t* row, uint32_t width, uint64_t& sum, uint64_t& sumSq) {
  for (uint32_t i = 0; i < width; ++i) {
    uint32_t p = row[i];
    sum += p;
    sumSq += p * p;
  }
}
#endif

}  // namespace

void analyzeRoiLuma(
    const uint8_t* yPlane,
    size_t rowStride,
    uint32_t planeWidth,
    uint32_t planeHeight,
    int32_t roiX,
    int32_t roiY,
    int32_t roiW,
    int32_t roiH,
    RoiLumaStats* out) {
  out->mean = 0.0;
  out->variance = 0.0;
  out->count = 0;

  if (!yPlane || rowStride == 0 || planeWidth == 0 || planeHeight == 0) {
    return;
  }

  // Clamp ROI to the plane. Handle negative x/y by trimming from the
  // left/top rather than clamping to 0 (which would silently shift the
  // region).
  int32_t x0 = std::max<int32_t>(0, roiX);
  int32_t y0 = std::max<int32_t>(0, roiY);
  int32_t x1 = std::min<int32_t>(
      static_cast<int32_t>(planeWidth), roiX + roiW);
  int32_t y1 = std::min<int32_t>(
      static_cast<int32_t>(planeHeight), roiY + roiH);
  if (x1 <= x0 || y1 <= y0) {
    return;
  }

  uint32_t w = static_cast<uint32_t>(x1 - x0);
  uint32_t h = static_cast<uint32_t>(y1 - y0);

  uint64_t sum = 0;
  uint64_t sumSq = 0;
  const uint8_t* row = yPlane + static_cast<size_t>(y0) * rowStride + x0;
  for (uint32_t r = 0; r < h; ++r) {
#if defined(__ARM_NEON)
    accumRowNeon(row, w, sum, sumSq);
#else
    accumRowScalar(row, w, sum, sumSq);
#endif
    row += rowStride;
  }

  uint32_t count = w * h;
  double mean = static_cast<double>(sum) / static_cast<double>(count);
  // Var = E[X^2] - E[X]^2. Compute in double from integer totals to
  // avoid catastrophic cancellation on near-uniform ROIs (sum²/n² is
  // very close to sumSq/n there, so the naive form would drop bits).
  double meanSq = static_cast<double>(sumSq) / static_cast<double>(count);
  double variance = meanSq - mean * mean;
  // Clamp tiny negatives from floating-point roundoff on uniform ROIs.
  if (variance < 0.0) variance = 0.0;

  out->mean = mean;
  out->variance = variance;
  out->count = count;
}
