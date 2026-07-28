// Pure-C bridge over the internal C++ analyzer, so the iOS Swift shim
// can call in via a plain @_silgen_name/module import without needing
// C++ interop. Mirrors the DngDecoder pattern (DngDecoderC.h).
#pragma once

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

// Compute mean + variance of an 8-bit Y-plane ROI. See frame_analyzer.h
// for full semantics. Values are written through the out pointers;
// passing a null out pointer skips that write. `outCount` is a double
// (rather than uint32_t) so the Swift call site can hand it straight
// into a Nitro-generated struct whose count field is `Double`.
void frameAnalyzerAnalyzeYPlane(
    const uint8_t* yPlane,
    size_t rowStride,
    uint32_t planeWidth,
    uint32_t planeHeight,
    int32_t roiX,
    int32_t roiY,
    int32_t roiW,
    int32_t roiH,
    double* outMean,
    double* outVariance,
    double* outCount);

#ifdef __cplusplus
}
#endif
