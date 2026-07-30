//
//  HybridDngDecoder.swift
//  DngDecoder
//
//  Nitro-hybrid entry point for iOS. Split decode strategy:
//    - decodeDngRois uses Apple's CIRAWFilter, which handles ProRAW's
//      lossless-JPEG + tiled + LinearRaw layout that our custom C++
//      parser doesn't (and can't reasonably grow to). See phase-3
//      decisions in docs/raw-camera-plan.md.
//    - readMetadata still calls the C++ parser via the pure-C bridge —
//      it doesn't touch pixel data, so compression/tiling don't matter
//      for the tags we extract. Will fail on ProRAW because the pixel
//      loading code path is exercised at the end of parseDng; that's
//      acceptable for phase 3 since nothing calls readMetadata yet.
//
//  Android's HybridDngDecoder.kt continues to call the C++ path for
//  plain-Bayer DNGs from CameraX.
//

import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import NitroModules
import UIKit

class HybridDngDecoder: HybridDngDecoderSpec {
  func readMetadata(dngPath: String) throws -> DngMetadata {
    var out = DngMetadataC()
    let ok = dngDecoderReadMetadata(dngPath, &out)
    if !ok {
      let msg = out.errorMessage.map { String(cString: $0) } ?? "DNG parse failed"
      throw RuntimeError.error(withMessage: msg)
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
    let url = URL(fileURLWithPath: stripFileScheme(dngPath))

    guard let rawFilter = CIRAWFilter(imageURL: url) else {
      throw RuntimeError.error(
        withMessage: "CIRAWFilter could not open DNG at \(url.path)")
    }
    configureRawFilter(rawFilter, url: url, tag: "decodeDngRois")

    guard let ciImage = rawFilter.outputImage else {
      throw RuntimeError.error(withMessage: "CIRAWFilter produced no outputImage")
    }
    let extent = ciImage.extent
    NSLog(
      "DngDecoder: CIRAWFilter output extent = %.0fx%.0f at (%.0f, %.0f)",
      extent.width, extent.height, extent.origin.x, extent.origin.y)

    // Render into a linear-sRGB working space. CIRAWFilter's internal
    // color transform (via ColorMatrix1/2 in the DNG metadata) maps
    // camera-native RGB to this space, so subsequent Munsell matching
    // consumes the returned triples as ordinary linear sRGB.
    guard let linearSpace = CGColorSpace(name: CGColorSpace.linearSRGB) else {
      throw RuntimeError.error(withMessage: "linearSRGB color space unavailable")
    }
    let context = CIContext(options: [
      .workingColorSpace: linearSpace,
      .outputColorSpace: linearSpace,
    ])

    var results: [LinearRgb] = []
    results.reserveCapacity(rois.count)
    for (idx, roi) in rois.enumerated() {
      // ROI coordinates arrive in top-left origin. CoreImage uses a
      // bottom-left origin with fractional Y increasing upward.
      let cropRect = CGRect(
        x: extent.minX + CGFloat(roi.x),
        y: extent.maxY - CGFloat(roi.y + roi.h),
        width: CGFloat(roi.w),
        height: CGFloat(roi.h)
      )
      NSLog(
        "DngDecoder decodeDngRois[%d]: roi(top-left)=(%d,%d,%dx%d) → cropRect(CoreImage)=(%.0f,%.0f,%.0fx%.0f)",
        idx, roi.x, roi.y, roi.w, roi.h,
        cropRect.origin.x, cropRect.origin.y, cropRect.width, cropRect.height)
      let cropped = ciImage.cropped(to: cropRect)
      NSLog(
        "  cropped extent=(%.0f,%.0f,%.0fx%.0f) isEmpty=%@",
        cropped.extent.origin.x, cropped.extent.origin.y,
        cropped.extent.width, cropped.extent.height,
        cropped.extent.isEmpty ? "true" : "false")

      // Reduce the ROI to a single-pixel average via the built-in
      // Metal-accelerated area-average filter.
      let avg = CIFilter.areaAverage()
      avg.inputImage = cropped
      avg.extent = cropRect
      guard let averaged = avg.outputImage else {
        throw RuntimeError.error(
          withMessage: "CIAreaAverage produced no output for ROI")
      }

      // Render the 1×1 output to a float RGBA bitmap in linear sRGB.
      var bitmap: [Float] = [0, 0, 0, 0]
      context.render(
        averaged,
        toBitmap: &bitmap,
        rowBytes: MemoryLayout<Float>.size * 4,
        bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
        format: .RGBAf,
        colorSpace: linearSpace
      )

      let r = clamp01(Double(bitmap[0]))
      let g = clamp01(Double(bitmap[1]))
      let b = clamp01(Double(bitmap[2]))
      NSLog(
        "  raw bitmap=(%.4f, %.4f, %.4f, α=%.4f) → clamped(%.4f, %.4f, %.4f)",
        Double(bitmap[0]), Double(bitmap[1]), Double(bitmap[2]),
        Double(bitmap[3]), r, g, b)
      results.append(LinearRgb(r: r, g: g, b: b))
    }
    return results
  }

  func renderPreview(dngPath: String, maxDim: Double) throws -> PreviewImage {
    let url = URL(fileURLWithPath: stripFileScheme(dngPath))
    guard let rawFilter = CIRAWFilter(imageURL: url) else {
      throw RuntimeError.error(
        withMessage: "CIRAWFilter could not open DNG at \(url.path)")
    }
    configureRawFilter(rawFilter, url: url, tag: "renderPreview")

    guard let ciImage = rawFilter.outputImage else {
      throw RuntimeError.error(withMessage: "CIRAWFilter produced no outputImage")
    }

    // Compute scale to fit maxDim while preserving aspect ratio.
    let srcW = ciImage.extent.width
    let srcH = ciImage.extent.height
    let maxDimCG = CGFloat(maxDim)
    let scale = min(maxDimCG / srcW, maxDimCG / srcH, 1.0)
    let scaledImage: CIImage
    if scale < 1.0 {
      scaledImage = ciImage.transformed(
        by: CGAffineTransform(scaleX: scale, y: scale))
    } else {
      scaledImage = ciImage
    }
    let dstW = Int(scaledImage.extent.width.rounded())
    let dstH = Int(scaledImage.extent.height.rounded())

    // Render as sRGB (gamma-encoded, display-ready) for the preview —
    // we're just handing pixels to an <Image> component, not doing
    // further color math on them.
    guard let displaySpace = CGColorSpace(name: CGColorSpace.sRGB) else {
      throw RuntimeError.error(withMessage: "sRGB color space unavailable")
    }
    let context = CIContext(options: [
      .workingColorSpace: displaySpace,
      .outputColorSpace: displaySpace,
    ])
    guard
      let cgImage = context.createCGImage(
        scaledImage, from: scaledImage.extent, format: .RGBA8,
        colorSpace: displaySpace)
    else {
      throw RuntimeError.error(
        withMessage: "CIContext.createCGImage returned nil")
    }
    let uiImage = UIImage(cgImage: cgImage)
    guard let pngData = uiImage.pngData() else {
      throw RuntimeError.error(withMessage: "UIImage.pngData returned nil")
    }

    // Write to a stable-name file in the tmp dir. Name derived from the
    // source path so repeated calls don't churn the FS.
    let fileName =
      "dng-preview-\(url.deletingPathExtension().lastPathComponent).png"
    let outUrl = FileManager.default.temporaryDirectory.appendingPathComponent(
      fileName)
    do {
      try pngData.write(to: outUrl, options: .atomic)
    } catch {
      throw RuntimeError.error(
        withMessage: "Failed to write preview PNG: \(error.localizedDescription)")
    }
    return PreviewImage(
      uri: "file://\(outUrl.path)",
      width: Double(dstW),
      height: Double(dstH)
    )
  }

  func readPreviewGrayscale(dngPath: String, maxDim: Double) throws
    -> PreviewGrayscale
  {
    let url = URL(fileURLWithPath: stripFileScheme(dngPath))
    guard let rawFilter = CIRAWFilter(imageURL: url) else {
      throw RuntimeError.error(
        withMessage: "CIRAWFilter could not open DNG at \(url.path)")
    }
    configureRawFilter(rawFilter, url: url, tag: "readPreviewGrayscale")

    guard let ciImage = rawFilter.outputImage else {
      throw RuntimeError.error(withMessage: "CIRAWFilter produced no outputImage")
    }

    // Full-res dims from CIRAWFilter — same coord space decodeDngRois
    // works in. Included in the return value so JS callers can back
    // out preview-space → sensor-space scaling.
    let srcW = ciImage.extent.width
    let srcH = ciImage.extent.height
    let sourceWidth = Int(srcW.rounded())
    let sourceHeight = Int(srcH.rounded())
    let maxDimCG = CGFloat(maxDim)
    let scale = min(maxDimCG / srcW, maxDimCG / srcH, 1.0)
    let scaledImage: CIImage =
      scale < 1.0
      ? ciImage.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
      : ciImage
    let dstW = Int(scaledImage.extent.width.rounded())
    let dstH = Int(scaledImage.extent.height.rounded())

    // Render into sRGB so the byte values match what a user would see
    // in a screenshot — CV thresholds (e.g. "very bright" for chart
    // background / cutouts) are much easier to reason about in
    // display-gamma space than in linear light.
    guard let displaySpace = CGColorSpace(name: CGColorSpace.sRGB) else {
      throw RuntimeError.error(withMessage: "sRGB color space unavailable")
    }
    let context = CIContext(options: [
      .workingColorSpace: displaySpace,
      .outputColorSpace: displaySpace,
    ])
    guard
      let cgImage = context.createCGImage(
        scaledImage, from: scaledImage.extent, format: .RGBA8,
        colorSpace: displaySpace)
    else {
      throw RuntimeError.error(
        withMessage: "CIContext.createCGImage returned nil")
    }

    // Draw the CGImage into a 4-byte RGBA scratch buffer via a
    // hand-rolled CGContext, then reduce to Rec709 luma in a single
    // pass. Avoids relying on CIFormat.L8/R8 support (which varies by
    // OS version and can silently return a mis-configured pixel format).
    let bytesPerRow = dstW * 4
    var rgba = [UInt8](repeating: 0, count: bytesPerRow * dstH)
    let bitmapInfo: UInt32 =
      CGBitmapInfo.byteOrder32Big.rawValue
      | CGImageAlphaInfo.premultipliedLast.rawValue
    guard
      let ctx = CGContext(
        data: &rgba, width: dstW, height: dstH, bitsPerComponent: 8,
        bytesPerRow: bytesPerRow, space: displaySpace,
        bitmapInfo: bitmapInfo)
    else {
      throw RuntimeError.error(withMessage: "CGContext allocation failed")
    }
    ctx.draw(cgImage, in: CGRect(x: 0, y: 0, width: dstW, height: dstH))

    let pixelCount = dstW * dstH
    let buffer = ArrayBuffer.allocate(size: pixelCount)
    let out = buffer.data
    for i in 0..<pixelCount {
      let r = Int(rgba[i * 4])
      let g = Int(rgba[i * 4 + 1])
      let b = Int(rgba[i * 4 + 2])
      // Rec709 luma coefficients (0.2126, 0.7152, 0.0722), scaled to
      // integer fixed-point (÷256) and rounded — cheap, no float ops.
      let y = UInt8(min(255, (r * 54 + g * 183 + b * 19 + 128) >> 8))
      (out + i).pointee = y
    }

    return PreviewGrayscale(
      width: Double(dstW),
      height: Double(dstH),
      pixels: buffer,
      sourceWidth: Double(sourceWidth),
      sourceHeight: Double(sourceHeight)
    )
  }

  func readPreviewRgb(dngPath: String, maxDim: Double) throws -> PreviewRgb {
    // Same rendering pipeline as readPreviewGrayscale, but the reduction
    // step at the end just strips the alpha channel instead of collapsing
    // to luma — CV callers that need chromaticity (the Munsell chart
    // validator's white-mask stage) get all three channels here.
    let url = URL(fileURLWithPath: stripFileScheme(dngPath))
    guard let rawFilter = CIRAWFilter(imageURL: url) else {
      throw RuntimeError.error(
        withMessage: "CIRAWFilter could not open DNG at \(url.path)")
    }
    configureRawFilter(rawFilter, url: url, tag: "readPreviewRgb")

    guard let ciImage = rawFilter.outputImage else {
      throw RuntimeError.error(withMessage: "CIRAWFilter produced no outputImage")
    }

    let srcW = ciImage.extent.width
    let srcH = ciImage.extent.height
    let sourceWidth = Int(srcW.rounded())
    let sourceHeight = Int(srcH.rounded())
    let maxDimCG = CGFloat(maxDim)
    let scale = min(maxDimCG / srcW, maxDimCG / srcH, 1.0)
    let scaledImage: CIImage =
      scale < 1.0
      ? ciImage.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
      : ciImage
    let dstW = Int(scaledImage.extent.width.rounded())
    let dstH = Int(scaledImage.extent.height.rounded())

    guard let displaySpace = CGColorSpace(name: CGColorSpace.sRGB) else {
      throw RuntimeError.error(withMessage: "sRGB color space unavailable")
    }
    let context = CIContext(options: [
      .workingColorSpace: displaySpace,
      .outputColorSpace: displaySpace,
    ])
    guard
      let cgImage = context.createCGImage(
        scaledImage, from: scaledImage.extent, format: .RGBA8,
        colorSpace: displaySpace)
    else {
      throw RuntimeError.error(
        withMessage: "CIContext.createCGImage returned nil")
    }

    let bytesPerRow = dstW * 4
    var rgba = [UInt8](repeating: 0, count: bytesPerRow * dstH)
    let bitmapInfo: UInt32 =
      CGBitmapInfo.byteOrder32Big.rawValue
      | CGImageAlphaInfo.premultipliedLast.rawValue
    guard
      let ctx = CGContext(
        data: &rgba, width: dstW, height: dstH, bitsPerComponent: 8,
        bytesPerRow: bytesPerRow, space: displaySpace,
        bitmapInfo: bitmapInfo)
    else {
      throw RuntimeError.error(withMessage: "CGContext allocation failed")
    }
    ctx.draw(cgImage, in: CGRect(x: 0, y: 0, width: dstW, height: dstH))

    let pixelCount = dstW * dstH
    let buffer = ArrayBuffer.allocate(size: pixelCount * 3)
    let out = buffer.data
    for i in 0..<pixelCount {
      (out + i * 3).pointee = rgba[i * 4]
      (out + i * 3 + 1).pointee = rgba[i * 4 + 1]
      (out + i * 3 + 2).pointee = rgba[i * 4 + 2]
    }

    return PreviewRgb(
      width: Double(dstW),
      height: Double(dstH),
      pixels: buffer,
      sourceWidth: Double(sourceWidth),
      sourceHeight: Double(sourceHeight)
    )
  }

  // Shared pre-decode config for every CIRAWFilter entry point. Two
  // reasons this is centralized:
  //
  // 1. `boostAmount` / `boostShadowAmount` = 0 disable Apple's default
  //    tone shaping, keeping the RAW pipeline as linear as possible.
  //
  // 2. `orientation = .up` forces the sensor-native coordinate frame
  //    regardless of the DNG's Orientation EXIF tag. We saw the tag
  //    flip between EV=0 and EV=-1 captures (probably vision-camera's
  //    session reconfigure re-deriving `AVCaptureConnection.videoOrientation`
  //    from a stale value), which rotated `outputImage` and desynced the
  //    ROI coords chart-registration produces from the pixels the
  //    preview PNG shows. Forcing `.up` normalizes it.
  //
  // We log the DNG's stored orientation tag so we can confirm the
  // hypothesis without shipping the workaround forever if it turns out
  // to be a vision-camera bug we can fix upstream.
  private func configureRawFilter(
    _ rawFilter: CIRAWFilter, url: URL, tag: String
  ) {
    rawFilter.boostAmount = 0.0
    rawFilter.boostShadowAmount = 0.0
    let stored = readDngOrientation(url: url)
    let storedName = stored.map(orientationName) ?? "nil"
    NSLog(
      "DngDecoder [\(tag)]: DNG stored orientation=\(storedName), "
        + "forcing filter.orientation=.up")
    rawFilter.orientation = .up
  }

  private func readDngOrientation(url: URL) -> CGImagePropertyOrientation? {
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
      let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil)
        as? [CFString: Any],
      let raw = props[kCGImagePropertyOrientation] as? UInt32
    else {
      return nil
    }
    return CGImagePropertyOrientation(rawValue: raw)
  }

  private func orientationName(_ o: CGImagePropertyOrientation) -> String {
    switch o {
    case .up: return "up(1)"
    case .upMirrored: return "upMirrored(2)"
    case .down: return "down(3)"
    case .downMirrored: return "downMirrored(4)"
    case .leftMirrored: return "leftMirrored(5)"
    case .right: return "right(6)"
    case .rightMirrored: return "rightMirrored(7)"
    case .left: return "left(8)"
    @unknown default: return "unknown(\(o.rawValue))"
    }
  }

  private func channelChar(_ c: UInt8) -> String {
    switch c {
    case 0: return "R"
    case 1: return "G"
    case 2: return "B"
    default: return "?"
    }
  }

  private func stripFileScheme(_ path: String) -> String {
    if path.hasPrefix("file://") {
      return String(path.dropFirst("file://".count))
    }
    return path
  }

  private func clamp01(_ v: Double) -> Double {
    return max(0.0, min(1.0, v))
  }
}
