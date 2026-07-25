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

}  // extern "C"
