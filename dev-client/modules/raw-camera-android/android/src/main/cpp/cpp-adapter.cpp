// Minimal JNI OnLoad — hands off immediately to nitrogen-generated
// registerAllNatives(), which registers "RawCameraAndroid" in the
// HybridObjectRegistry. No custom C++ logic — the whole module is
// Kotlin.
#include <jni.h>
#include <fbjni/fbjni.h>

#include "RawCameraAndroidOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    margelo::nitro::rawcameraandroid::registerAllNatives();
  });
}
