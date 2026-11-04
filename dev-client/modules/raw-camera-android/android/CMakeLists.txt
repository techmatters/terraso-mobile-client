project(RawCameraAndroid)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME RawCameraAndroid)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

# Most of this module's logic is Kotlin (CameraX + Camera2 +
# DngCreator). The C++ pieces are:
#   - cpp-adapter.cpp: Nitro's JNI OnLoad bridge (registers the
#     RawCameraAndroid HybridObject).
#   - frame_analyzer.cpp: per-ROI Y-plane mean/variance for the phase-8
#     real-time overlay, NEON-optimised on ARM64. Called from the
#     CameraX ImageAnalysis thread via FrameAnalyzer.kt's JNI.
#     SHARED SOURCE — the single copy lives in the frame-analyzer module
#     (../../frame-analyzer/cpp) and is compiled here by relative path; the
#     iOS FrameAnalyzer pod compiles the same file. Only the JNI wrapper
#     (frame_analyzer_jni.cpp) is Android-specific.
add_library(${PACKAGE_NAME} SHARED
        src/main/cpp/cpp-adapter.cpp
        ../../frame-analyzer/cpp/frame_analyzer.cpp
        src/main/cpp/frame_analyzer_jni.cpp
)

# Make the shared analyzer header (next to the shared .cpp) resolvable for
# frame_analyzer_jni.cpp's #include "frame_analyzer.h".
target_include_directories(${PACKAGE_NAME} PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/../../frame-analyzer/cpp
)

include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/RawCameraAndroid+autolinking.cmake)

find_library(LOG_LIB log)

target_link_libraries(
        ${PACKAGE_NAME}
        ${LOG_LIB}
        android
)
