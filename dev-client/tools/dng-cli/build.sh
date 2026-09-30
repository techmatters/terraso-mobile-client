#!/usr/bin/env bash
# Build dng-cli. Produces ./build/dng-cli, a self-contained macOS binary
# that decodes DNG regions via CIRAWFilter. Depends only on the system
# swiftc + Core Image (no external packages).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
swiftc -O -o build/dng-cli main.swift
echo "built $(pwd)/build/dng-cli"
