#!/usr/bin/env bash
# Build dng-cli. Produces ./build/dng-cli, a self-contained macOS binary
# that decodes DNG regions via CIRAWFilter. Uses the system swiftc + Core
# Image, plus the shared C++ median-cut dominant reducer linked in from
# modules/dng-decoder/cpp (so the iOS RAW path emits the SAME "dominant"
# as the app and the Android C++ path).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build

CPP_DIR="../../modules/dng-decoder/cpp"

# Compile the shared median-cut + the thin C ABI bridge. MedianCut.cpp
# only touches the header-only LinearRgbF type, so this does not pull in
# the DNG parser / libtiff.
clang++ -std=c++17 -O2 -I "$CPP_DIR" -c "$CPP_DIR/MedianCut.cpp" -o build/MedianCut.o
clang++ -std=c++17 -O2 -I "$CPP_DIR" -c dominant_bridge.cpp -o build/dominant_bridge.o

# Link the C++ objects into the Swift binary; the bridging header exposes
# dngcli_dominant_linear_rgb to Swift.
swiftc -O -o build/dng-cli main.swift \
  build/MedianCut.o build/dominant_bridge.o \
  -import-objc-header bridging.h \
  -lc++

echo "built $(pwd)/build/dng-cli"
