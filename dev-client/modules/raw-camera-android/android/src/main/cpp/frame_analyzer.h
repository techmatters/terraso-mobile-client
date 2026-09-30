#pragma once

#include <cstddef>
#include <cstdint>

// Per-ROI luminance statistics computed from an 8-bit Y plane.
// `count` is the number of pixels sampled (equals roiW * roiH after
// clamping to plane bounds; may be 0 for empty ROIs).
struct RoiLumaStats {
  double mean;      // 0..255
  double variance;  // 0..65025 (in squared-luma units)
  uint32_t count;
};

// Compute mean + variance of an 8-bit Y-plane ROI.
//
// yPlane / rowStride follow the standard CameraX YUV_420_888 layout:
// bytes are contiguous within a row, `rowStride` bytes between rows
// (may be > planeWidth for padding).
//
// The ROI is clamped to [0, planeWidth) x [0, planeHeight) — passing an
// out-of-range ROI returns stats for the intersection, with count=0 and
// mean=variance=0 if the intersection is empty.
//
// Integer arithmetic in the hot loop (u32/u64 accumulators). On ARM64
// with __ARM_NEON, uses 16-wide vector loads + u8×u8→u16 mull for
// sum-of-squares. Scalar fallback everywhere else (x86 emulator).
void analyzeRoiLuma(
    const uint8_t* yPlane,
    size_t rowStride,
    uint32_t planeWidth,
    uint32_t planeHeight,
    int32_t roiX,
    int32_t roiY,
    int32_t roiW,
    int32_t roiH,
    RoiLumaStats* out);
