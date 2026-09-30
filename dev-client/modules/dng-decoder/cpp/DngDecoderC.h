// Pure-C bridge over the C++ DngDecoder engine. Both iOS Swift and Android
// JNI shims call in through these functions rather than into C++ directly,
// which keeps the per-platform glue minimal.

#ifndef DNG_DECODER_C_H
#define DNG_DECODER_C_H

#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
  int32_t width;
  int32_t height;
  int32_t bitsPerSample;
  // CFA layout as 4 chars, one per 2×2 cell in row-major order:
  // 0 = R, 1 = G, 2 = B.
  int32_t cfa0;
  int32_t cfa1;
  int32_t cfa2;
  int32_t cfa3;
  double blackLevel;   // averaged across channels for the summary
  double whiteLevel;
  bool isMonochrome;
  // Error output; NULL when parsed=true. Owned by the callee, valid until
  // the next call to a DngDecoderC function on the same thread.
  const char* errorMessage;
  bool parsed;
} DngMetadataC;

// Populate out from the DNG at path. Returns via out->parsed / out->errorMessage.
bool dngDecoderReadMetadata(const char* path, DngMetadataC* out);

// Decode `count` ROIs from the DNG at path. Each ROI in `rois` is 4 int32s
// (x, y, w, h). Outputs three parallel double arrays sized `count`. On
// failure, returns false and sets *errorOut to a static error string.
bool dngDecoderDecodeRois(const char* path, const int32_t* rois, int32_t count,
                          double* outR, double* outG, double* outB,
                          const char** errorOut);

// Dual-reducer variant of dngDecoderDecodeRois: for each ROI produces
// BOTH the per-channel mean AND the median-cut dominant colour
// (largest of 5 quantised vboxes — semantic match for the production
// JPEG `dominantColor` algorithm). Six parallel double arrays, all
// sized `count`. mean* values are byte-identical to what
// dngDecoderDecodeRois returns for the same ROI. Same error
// convention.
bool dngDecoderDecodeRoisReduced(const char* path, const int32_t* rois,
                                 int32_t count,
                                 double* outMeanR, double* outMeanG,
                                 double* outMeanB, double* outDomR,
                                 double* outDomG, double* outDomB,
                                 const char** errorOut);

// Sibling of dngDecoderDecodeRoisReduced that ALSO returns per-channel
// variance across the ROI (in linear-sRGB space, unbiased population
// variance). Nine parallel double arrays. mean* and dom* are byte-
// identical to what dngDecoderDecodeRoisReduced returns for the
// same ROI — the underlying pipeline is the same, this variant just
// exposes an accumulator that was already being computed anyway.
// Used by the analyzer's multi-card sweep to score sample-rect
// homogeneity (low variance = sample sits on a uniform patch).
// CLI-only for now (dng-cli-cpp batch endpoint); on-device Nitro
// path continues to use dngDecoderDecodeRoisReduced.
bool dngDecoderDecodeRoisReducedWithVar(
    const char* path, const int32_t* rois, int32_t count,
    double* outMeanR, double* outMeanG, double* outMeanB,
    // Per-channel pipeline mean WITHOUT the [0, 1] display clamp
    // (see RoiReduced::meanUnclamped for why).
    double* outMeanUncR, double* outMeanUncG, double* outMeanUncB,
    double* outDomR, double* outDomG, double* outDomB,
    double* outVarR, double* outVarG, double* outVarB,
    const char** errorOut);

// Render a sub-sampled preview from the DNG at path. On success, sets
// *outWidth, *outHeight, and allocates *outBytes (caller must free
// with dngDecoderFreePreview). *outByteCount = *outWidth * *outHeight * 4.
// Pixel format is ARGB8888 (0xFFRRGGBB per uint32_t), matching Android's
// Bitmap.Config.ARGB_8888 int layout.
bool dngDecoderRenderPreviewRgba(const char* path, int32_t maxDim,
                                 int32_t* outWidth, int32_t* outHeight,
                                 uint32_t** outBytes, int32_t* outByteCount,
                                 const char** errorOut);

// Free a buffer previously returned by dngDecoderRenderPreviewRgba.
// No-op on null. Must be paired 1:1 with the render call.
void dngDecoderFreePreview(uint32_t* bytes);

#ifdef __cplusplus
}
#endif

#endif  // DNG_DECODER_C_H
