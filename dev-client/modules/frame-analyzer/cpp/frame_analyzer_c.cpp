#include "frame_analyzer_c.h"

#include "frame_analyzer.h"

extern "C" void frameAnalyzerAnalyzeYPlane(
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
    double* outCount) {
  RoiLumaStats stats{};
  analyzeRoiLuma(
      yPlane,
      rowStride,
      planeWidth,
      planeHeight,
      roiX,
      roiY,
      roiW,
      roiH,
      &stats);
  if (outMean) *outMean = stats.mean;
  if (outVariance) *outVariance = stats.variance;
  if (outCount) *outCount = static_cast<double>(stats.count);
}
