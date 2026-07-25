//
//  HybridDngDecoder.swift
//  DngDecoder
//
//  Nitro-hybrid entry point that bridges JS calls into the C++ engine
//  (DngParser + DngPipeline in ../cpp/). See docs/raw-camera-plan.md.
//

import Foundation
import NitroModules

class HybridDngDecoder: HybridDngDecoderSpec {
  func readMetadata(dngPath: String) throws -> DngMetadata {
    var out = DngMetadataC()
    let ok = dngDecoderReadMetadata(dngPath, &out)
    if !ok.parsed {
      throw RuntimeError.error(withMessage: String(cString: ok.errorMessage!))
    }
    let cfaChars: [UInt8] = [out.cfa0, out.cfa1, out.cfa2, out.cfa3].map(UInt8.init)
    let cfaString =
      cfaChars.map { channelChar($0) }.reduce("", +)
    return DngMetadata(
      width: Double(out.width),
      height: Double(out.height),
      bitsPerSample: Double(out.bitsPerSample),
      cfaPattern: cfaString,
      blackLevel: out.blackLevel,
      whiteLevel: out.whiteLevel,
      isMonochrome: out.isMonochrome
    )
  }

  func decodeDngRois(dngPath: String, rois: [Roi]) throws -> [LinearRgb] {
    // Flatten ROIs into a C-friendly int32 array [x,y,w,h, ...] then call
    // into the shared C++ engine.
    var flat: [Int32] = []
    flat.reserveCapacity(rois.count * 4)
    for r in rois {
      flat.append(Int32(r.x))
      flat.append(Int32(r.y))
      flat.append(Int32(r.w))
      flat.append(Int32(r.h))
    }
    var outR = [Double](repeating: 0, count: rois.count)
    var outG = [Double](repeating: 0, count: rois.count)
    var outB = [Double](repeating: 0, count: rois.count)
    var err: UnsafePointer<CChar>? = nil
    let ok = flat.withUnsafeBufferPointer { flatBuf in
      outR.withUnsafeMutableBufferPointer { rBuf in
        outG.withUnsafeMutableBufferPointer { gBuf in
          outB.withUnsafeMutableBufferPointer { bBuf in
            dngDecoderDecodeRois(
              dngPath,
              flatBuf.baseAddress, Int32(rois.count),
              rBuf.baseAddress, gBuf.baseAddress, bBuf.baseAddress,
              &err
            )
          }
        }
      }
    }
    if !ok {
      throw RuntimeError.error(
        withMessage: err.map { String(cString: $0) } ?? "DNG decode failed")
    }
    var out: [LinearRgb] = []
    out.reserveCapacity(rois.count)
    for i in 0..<rois.count {
      out.append(LinearRgb(r: outR[i], g: outG[i], b: outB[i]))
    }
    return out
  }

  private func channelChar(_ c: UInt8) -> String {
    switch c {
    case 0: return "R"
    case 1: return "G"
    case 2: return "B"
    default: return "?"
    }
  }
}
