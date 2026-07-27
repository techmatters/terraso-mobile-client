project(RawCameraAndroid)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME RawCameraAndroid)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

# This module's actual logic is 100% Kotlin (CameraX + Camera2 +
# DngCreator). The only reason we build a native library at all is that
# Nitro's Android integration wires HybridObjects through a JNI OnLoad
# bridge — so we compile the nitrogen-generated JNI shim + a minimal
# cpp-adapter.cpp that calls it.
add_library(${PACKAGE_NAME} SHARED
        src/main/cpp/cpp-adapter.cpp
)

include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/RawCameraAndroid+autolinking.cmake)

find_library(LOG_LIB log)

target_link_libraries(
        ${PACKAGE_NAME}
        ${LOG_LIB}
        android
)
