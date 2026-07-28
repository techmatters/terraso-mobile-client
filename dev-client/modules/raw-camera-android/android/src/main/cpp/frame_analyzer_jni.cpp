// JNI bridge for the frame analyzer. Called from a background CameraX
// ImageAnalysis thread; the Kotlin wrapper hands us the Y plane as a
// direct ByteBuffer wrapping the hardware image buffer, so no copy.
//
// Signature returns the stats via a caller-owned double[3] to keep the
// analyzer allocation-free per frame.
#include <jni.h>

#include <cstdint>

#include "frame_analyzer.h"

extern "C" JNIEXPORT void JNICALL
Java_com_margelo_nitro_rawcameraandroid_FrameAnalyzer_nativeAnalyzeYPlane(
    JNIEnv* env,
    jclass /*clazz*/,
    jobject yPlaneBuffer,
    jint rowStride,
    jint planeWidth,
    jint planeHeight,
    jint roiX,
    jint roiY,
    jint roiW,
    jint roiH,
    jdoubleArray out) {
  if (!yPlaneBuffer || !out) return;

  // Direct ByteBuffer only — CameraX Image.Plane.buffer is always
  // direct. If somebody hands us an indirect buffer, address is null
  // and we no-op.
  const auto* base =
      static_cast<const uint8_t*>(env->GetDirectBufferAddress(yPlaneBuffer));
  if (!base) return;

  RoiLumaStats stats{};
  analyzeRoiLuma(
      base,
      static_cast<size_t>(rowStride),
      static_cast<uint32_t>(planeWidth),
      static_cast<uint32_t>(planeHeight),
      roiX,
      roiY,
      roiW,
      roiH,
      &stats);

  // Write mean/variance/count into caller's array without allocating.
  jdouble values[3] = {
      stats.mean, stats.variance, static_cast<jdouble>(stats.count)};
  env->SetDoubleArrayRegion(out, 0, 3, values);
}
