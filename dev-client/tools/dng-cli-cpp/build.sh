#!/usr/bin/env bash
# Build dng-cli-cpp. Produces ./build/dng-cli-cpp, a mac-native binary
# that wraps the same C++ DNG decoder that runs on Android on-device
# via JNI. See main.cpp / docs/android-raw-path.md for why.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build

CPP_DIR="../../modules/dng-decoder/cpp"

clang++ -std=c++17 -O2 -Wall -Wextra \
  -I"${CPP_DIR}" \
  main.cpp \
  "${CPP_DIR}/DngParser.cpp" \
  "${CPP_DIR}/DngPipeline.cpp" \
  "${CPP_DIR}/DngDecoderC.cpp" \
  -o build/dng-cli-cpp

echo "built $(pwd)/build/dng-cli-cpp"
