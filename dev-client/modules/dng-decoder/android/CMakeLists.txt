project(DngDecoder)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME DngDecoder)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

# Core engine sources: TIFF parsing, demosaic, color pipeline
file(GLOB ENGINE_SOURCES "../cpp/*.cpp")

add_library(${PACKAGE_NAME} SHARED
        src/main/cpp/cpp-adapter.cpp
        src/main/cpp/DngDecoderJni.cpp
        ${ENGINE_SOURCES}
)

include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/DngDecoder+autolinking.cmake)

include_directories(
        "src/main/cpp"
        "../cpp"
)

find_library(LOG_LIB log)

target_link_libraries(
        ${PACKAGE_NAME}
        ${LOG_LIB}
        android
)
