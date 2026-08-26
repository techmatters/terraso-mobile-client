#include "DngDecoderC.h"

#include <cstring>
#include <exception>
#include <string>

#include "DngParser.hpp"
#include "DngPipeline.hpp"

namespace {

// Per-thread scratch space for error messages so callers can safely hold
// onto the pointer through the return path.
thread_local std::string tlsErrorMessage;

const char* stashError(const char* what) {
  tlsErrorMessage = what ? what : "unknown error";
  return tlsErrorMessage.c_str();
}

}  // namespace

extern "C" {

bool dngDecoderReadMetadata(const char* path, DngMetadataC* out) {
  if (!path || !out) return false;
  try {
    dngdecoder::ParsedDng parsed = dngdecoder::parseDng(path);
    out->width = static_cast<int32_t>(parsed.width);
    out->height = static_cast<int32_t>(parsed.height);
    out->bitsPerSample = static_cast<int32_t>(parsed.bitsPerSample);
    out->cfa0 = parsed.cfa[0][0];
    out->cfa1 = parsed.cfa[0][1];
    out->cfa2 = parsed.cfa[1][0];
    out->cfa3 = parsed.cfa[1][1];
    out->blackLevel = (parsed.blackLevel[0] + parsed.blackLevel[1] +
                       parsed.blackLevel[2]) /
                      3.0;
    out->whiteLevel = parsed.whiteLevel;
    out->isMonochrome = false;
    out->errorMessage = nullptr;
    out->parsed = true;
    return true;
  } catch (const std::exception& e) {
    out->errorMessage = stashError(e.what());
    out->parsed = false;
    return false;
  } catch (...) {
    out->errorMessage = stashError("unknown exception in dngDecoderReadMetadata");
    out->parsed = false;
    return false;
  }
}

bool dngDecoderDecodeRois(const char* path, const int32_t* rois, int32_t count,
                          double* outR, double* outG, double* outB,
                          const char** errorOut) {
  if (!path || !rois || !outR || !outG || !outB || count < 0) {
    if (errorOut) *errorOut = stashError("null argument");
    return false;
  }
  try {
    dngdecoder::ParsedDng parsed = dngdecoder::parseDng(path);
    for (int32_t i = 0; i < count; ++i) {
      const int32_t* r = rois + i * 4;
      const dngdecoder::RoiPx roi{
          static_cast<uint32_t>(r[0]), static_cast<uint32_t>(r[1]),
          static_cast<uint32_t>(r[2]), static_cast<uint32_t>(r[3])};
      const dngdecoder::LinearRgbF rgb = dngdecoder::decodeRoi(parsed, roi);
      outR[i] = rgb.r;
      outG[i] = rgb.g;
      outB[i] = rgb.b;
    }
    if (errorOut) *errorOut = nullptr;
    return true;
  } catch (const std::exception& e) {
    if (errorOut) *errorOut = stashError(e.what());
    return false;
  } catch (...) {
    if (errorOut) *errorOut = stashError("unknown exception in dngDecoderDecodeRois");
    return false;
  }
}

bool dngDecoderDecodeRoisReduced(const char* path, const int32_t* rois,
                                 int32_t count,
                                 double* outMeanR, double* outMeanG,
                                 double* outMeanB, double* outDomR,
                                 double* outDomG, double* outDomB,
                                 const char** errorOut) {
  if (!path || !rois || !outMeanR || !outMeanG || !outMeanB ||
      !outDomR || !outDomG || !outDomB || count < 0) {
    if (errorOut) *errorOut = stashError("null argument");
    return false;
  }
  try {
    dngdecoder::ParsedDng parsed = dngdecoder::parseDng(path);
    for (int32_t i = 0; i < count; ++i) {
      const int32_t* r = rois + i * 4;
      const dngdecoder::RoiPx roi{
          static_cast<uint32_t>(r[0]), static_cast<uint32_t>(r[1]),
          static_cast<uint32_t>(r[2]), static_cast<uint32_t>(r[3])};
      const dngdecoder::RoiReduced red =
          dngdecoder::decodeRoiReduced(parsed, roi);
      outMeanR[i] = red.mean.r;
      outMeanG[i] = red.mean.g;
      outMeanB[i] = red.mean.b;
      outDomR[i] = red.dominant.r;
      outDomG[i] = red.dominant.g;
      outDomB[i] = red.dominant.b;
    }
    if (errorOut) *errorOut = nullptr;
    return true;
  } catch (const std::exception& e) {
    if (errorOut) *errorOut = stashError(e.what());
    return false;
  } catch (...) {
    if (errorOut)
      *errorOut = stashError("unknown exception in dngDecoderDecodeRoisReduced");
    return false;
  }
}

bool dngDecoderDecodeRoisReducedWithVar(
    const char* path, const int32_t* rois, int32_t count,
    double* outMeanR, double* outMeanG, double* outMeanB,
    double* outDomR, double* outDomG, double* outDomB,
    double* outVarR, double* outVarG, double* outVarB,
    const char** errorOut) {
  if (!path || !rois || !outMeanR || !outMeanG || !outMeanB ||
      !outDomR || !outDomG || !outDomB ||
      !outVarR || !outVarG || !outVarB || count < 0) {
    if (errorOut) *errorOut = stashError("null argument");
    return false;
  }
  try {
    dngdecoder::ParsedDng parsed = dngdecoder::parseDng(path);
    for (int32_t i = 0; i < count; ++i) {
      const int32_t* r = rois + i * 4;
      const dngdecoder::RoiPx roi{
          static_cast<uint32_t>(r[0]), static_cast<uint32_t>(r[1]),
          static_cast<uint32_t>(r[2]), static_cast<uint32_t>(r[3])};
      const dngdecoder::RoiReduced red =
          dngdecoder::decodeRoiReduced(parsed, roi);
      outMeanR[i] = red.mean.r;
      outMeanG[i] = red.mean.g;
      outMeanB[i] = red.mean.b;
      outDomR[i] = red.dominant.r;
      outDomG[i] = red.dominant.g;
      outDomB[i] = red.dominant.b;
      outVarR[i] = red.variance.r;
      outVarG[i] = red.variance.g;
      outVarB[i] = red.variance.b;
    }
    if (errorOut) *errorOut = nullptr;
    return true;
  } catch (const std::exception& e) {
    if (errorOut) *errorOut = stashError(e.what());
    return false;
  } catch (...) {
    if (errorOut)
      *errorOut =
          stashError("unknown exception in dngDecoderDecodeRoisReducedWithVar");
    return false;
  }
}

bool dngDecoderRenderPreviewRgba(const char* path, int32_t maxDim,
                                 int32_t* outWidth, int32_t* outHeight,
                                 uint32_t** outBytes, int32_t* outByteCount,
                                 const char** errorOut) {
  if (!path || !outWidth || !outHeight || !outBytes || !outByteCount ||
      maxDim < 16) {
    if (errorOut) *errorOut = stashError("null argument or maxDim too small");
    return false;
  }
  try {
    dngdecoder::ParsedDng parsed = dngdecoder::parseDng(path);
    dngdecoder::PreviewRgba preview =
        dngdecoder::renderPreviewRgba(parsed, static_cast<uint32_t>(maxDim));
    const size_t pixelCount = size_t(preview.width) * preview.height;
    // Heap-allocate the buffer that the caller will free via
    // dngDecoderFreePreview. `new[]` matches the delete[] in that free
    // function.
    uint32_t* buf = new uint32_t[pixelCount];
    std::memcpy(buf, preview.argb.data(), pixelCount * sizeof(uint32_t));
    *outWidth = static_cast<int32_t>(preview.width);
    *outHeight = static_cast<int32_t>(preview.height);
    *outBytes = buf;
    *outByteCount = static_cast<int32_t>(pixelCount * sizeof(uint32_t));
    if (errorOut) *errorOut = nullptr;
    return true;
  } catch (const std::exception& e) {
    if (errorOut) *errorOut = stashError(e.what());
    return false;
  } catch (...) {
    if (errorOut)
      *errorOut = stashError("unknown exception in dngDecoderRenderPreviewRgba");
    return false;
  }
}

void dngDecoderFreePreview(uint32_t* bytes) {
  delete[] bytes;
}

}  // extern "C"
