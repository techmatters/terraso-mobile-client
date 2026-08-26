// JNI bridge for the Kotlin HybridDngDecoder → C++ engine.
// The C++ engine itself is in ../../../../../cpp/ (compiled into the same
// libDngDecoder.so via the module's CMakeLists.txt).

#include <jni.h>

#include <string>
#include <vector>

#include "DngDecoderC.h"

namespace {

jstring toJavaString(JNIEnv* env, const char* s) {
  return s ? env->NewStringUTF(s) : nullptr;
}

void setErrorSlot(JNIEnv* env, jobjectArray errArr, const char* msg) {
  if (!errArr || !msg) return;
  env->SetObjectArrayElement(errArr, 0, toJavaString(env, msg));
}

}  // namespace

extern "C" {

JNIEXPORT jboolean JNICALL
Java_com_margelo_nitro_dngdecoder_HybridDngDecoder_nativeReadMetadata(
    JNIEnv* env, jobject /*thiz*/, jstring jpath, jintArray jdims,
    jintArray jcfa, jdoubleArray jout, jobjectArray jerr) {
  const char* cpath = env->GetStringUTFChars(jpath, nullptr);
  DngMetadataC meta{};
  const bool ok = dngDecoderReadMetadata(cpath, &meta);
  env->ReleaseStringUTFChars(jpath, cpath);
  if (!ok) {
    setErrorSlot(env, jerr, meta.errorMessage);
    return JNI_FALSE;
  }
  jint dims[3]{meta.width, meta.height, meta.bitsPerSample};
  env->SetIntArrayRegion(jdims, 0, 3, dims);
  jint cfa[4]{meta.cfa0, meta.cfa1, meta.cfa2, meta.cfa3};
  env->SetIntArrayRegion(jcfa, 0, 4, cfa);
  jdouble out[3]{meta.blackLevel, meta.whiteLevel, 0.0};
  env->SetDoubleArrayRegion(jout, 0, 3, out);
  return JNI_TRUE;
}

JNIEXPORT jboolean JNICALL
Java_com_margelo_nitro_dngdecoder_HybridDngDecoder_nativeDecodeRois(
    JNIEnv* env, jobject /*thiz*/, jstring jpath, jintArray jrois,
    jdoubleArray joutR, jdoubleArray joutG, jdoubleArray joutB,
    jobjectArray jerr) {
  const char* cpath = env->GetStringUTFChars(jpath, nullptr);
  const jsize roiLen = env->GetArrayLength(jrois);
  const jint count = roiLen / 4;
  std::vector<jint> rois(roiLen);
  env->GetIntArrayRegion(jrois, 0, roiLen, rois.data());
  std::vector<double> outR(count), outG(count), outB(count);
  const char* errPtr = nullptr;
  const bool ok = dngDecoderDecodeRois(
      cpath, reinterpret_cast<const int32_t*>(rois.data()), count,
      outR.data(), outG.data(), outB.data(), &errPtr);
  env->ReleaseStringUTFChars(jpath, cpath);
  if (!ok) {
    setErrorSlot(env, jerr, errPtr);
    return JNI_FALSE;
  }
  env->SetDoubleArrayRegion(joutR, 0, count, outR.data());
  env->SetDoubleArrayRegion(joutG, 0, count, outG.data());
  env->SetDoubleArrayRegion(joutB, 0, count, outB.data());
  return JNI_TRUE;
}

// Dual-reducer sibling of nativeDecodeRois. Returns per-channel mean
// + median-cut dominant in six parallel DoubleArrays. The mean output
// is byte-identical to what nativeDecodeRois returns for the same ROI.
JNIEXPORT jboolean JNICALL
Java_com_margelo_nitro_dngdecoder_HybridDngDecoder_nativeDecodeRoisReduced(
    JNIEnv* env, jobject /*thiz*/, jstring jpath, jintArray jrois,
    jdoubleArray joutMeanR, jdoubleArray joutMeanG, jdoubleArray joutMeanB,
    jdoubleArray joutDomR, jdoubleArray joutDomG, jdoubleArray joutDomB,
    jobjectArray jerr) {
  const char* cpath = env->GetStringUTFChars(jpath, nullptr);
  const jsize roiLen = env->GetArrayLength(jrois);
  const jint count = roiLen / 4;
  std::vector<jint> rois(roiLen);
  env->GetIntArrayRegion(jrois, 0, roiLen, rois.data());
  std::vector<double> mR(count), mG(count), mB(count);
  std::vector<double> dR(count), dG(count), dB(count);
  const char* errPtr = nullptr;
  const bool ok = dngDecoderDecodeRoisReduced(
      cpath, reinterpret_cast<const int32_t*>(rois.data()), count,
      mR.data(), mG.data(), mB.data(), dR.data(), dG.data(), dB.data(),
      &errPtr);
  env->ReleaseStringUTFChars(jpath, cpath);
  if (!ok) {
    setErrorSlot(env, jerr, errPtr);
    return JNI_FALSE;
  }
  env->SetDoubleArrayRegion(joutMeanR, 0, count, mR.data());
  env->SetDoubleArrayRegion(joutMeanG, 0, count, mG.data());
  env->SetDoubleArrayRegion(joutMeanB, 0, count, mB.data());
  env->SetDoubleArrayRegion(joutDomR, 0, count, dR.data());
  env->SetDoubleArrayRegion(joutDomG, 0, count, dG.data());
  env->SetDoubleArrayRegion(joutDomB, 0, count, dB.data());
  return JNI_TRUE;
}

// Kotlin signature (see HybridDngDecoder.kt):
//   nativeRenderPreview(path: String, maxDim: Int, dims: IntArray[2], err)
//     : IntArray?
//
// dims[0] = output width, dims[1] = output height.
// Returns null on error and stashes the message in err[0]; otherwise
// returns an IntArray of length width*height where each element is an
// ARGB8888 pixel (0xFFRRGGBB), directly consumable by
// Bitmap.createBitmap(int[], w, h, ARGB_8888).
//
// jint is 32-bit signed; the ARGB values (0xFFxxxxxx) cast to
// negative signed ints, which Bitmap handles correctly (it reads the
// int as unsigned bits).
JNIEXPORT jintArray JNICALL
Java_com_margelo_nitro_dngdecoder_HybridDngDecoder_nativeRenderPreview(
    JNIEnv* env, jobject /*thiz*/, jstring jpath, jint jmaxDim,
    jintArray jdims, jobjectArray jerr) {
  const char* cpath = env->GetStringUTFChars(jpath, nullptr);
  int32_t width = 0;
  int32_t height = 0;
  uint32_t* buf = nullptr;
  int32_t byteCount = 0;
  const char* errPtr = nullptr;
  const bool ok = dngDecoderRenderPreviewRgba(
      cpath, static_cast<int32_t>(jmaxDim), &width, &height, &buf, &byteCount,
      &errPtr);
  env->ReleaseStringUTFChars(jpath, cpath);
  if (!ok) {
    setErrorSlot(env, jerr, errPtr);
    return nullptr;
  }
  jint dims[2]{width, height};
  env->SetIntArrayRegion(jdims, 0, 2, dims);

  const jsize pixels = width * height;
  jintArray result = env->NewIntArray(pixels);
  if (!result) {
    dngDecoderFreePreview(buf);
    setErrorSlot(env, jerr, "renderPreview: could not allocate IntArray");
    return nullptr;
  }
  // Copy the uint32 ARGB buffer into the jintArray. Same 32-bit width,
  // same byte layout — the reinterpret_cast is safe for the memcpy but
  // signedness matters at the Kotlin API layer only.
  env->SetIntArrayRegion(
      result, 0, pixels, reinterpret_cast<const jint*>(buf));
  dngDecoderFreePreview(buf);
  return result;
}

}  // extern "C"
