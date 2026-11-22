//
//  HybridFrameAnalyzer.swift
//  FrameAnalyzer
//
//  Nitro-hybrid entry point for iOS. Called from a vision-camera
//  frame-output worklet with a Y-plane ArrayBuffer + geometry; delegates
//  to the pure-C `frameAnalyzerAnalyzeYPlane` wrapper (which in turn
//  calls the shared C++ NEON-optimised analyzer).
//
//  Runs on the vision-camera output thread, not the main thread. That's
//  fine — the C++ analyzer is pure and stateless, and Nitro's
//  ArrayBuffer.data is a raw pointer into the frame's pixel buffer that
//  the caller (worklet) keeps alive for the duration of this call.
//

import Foundation
import NitroModules

class HybridFrameAnalyzer: HybridFrameAnalyzerSpec {
  func analyzeYPlane(
    yPlane: ArrayBuffer,
    rowStride: Double,
    planeWidth: Double,
    planeHeight: Double,
    roiX: Double,
    roiY: Double,
    roiW: Double,
    roiH: Double
  ) throws -> RoiLumaStats {
    var mean = 0.0
    var variance = 0.0
    var count = 0.0
    frameAnalyzerAnalyzeYPlane(
      yPlane.data,
      Int(rowStride),
      UInt32(planeWidth),
      UInt32(planeHeight),
      Int32(roiX),
      Int32(roiY),
      Int32(roiW),
      Int32(roiH),
      &mean,
      &variance,
      &count
    )
    return RoiLumaStats(mean: mean, variance: variance, count: count)
  }
}
