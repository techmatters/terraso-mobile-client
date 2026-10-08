// Swift bridging header for dng-cli. Exposes the C ABI median-cut
// dominant-colour reducer implemented in dominant_bridge.cpp (which wraps
// the shared C++ MedianCut). Imported via `swiftc -import-objc-header`.
#pragma once

#include <stdbool.h>
#include <stdint.h>

bool dngcli_dominant_linear_rgb(const float* rgb, int32_t count,
                                double* outRgb);
