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

  // Photo-file variant of decodeDngRois. Loads the file via CIImage
  // (JPEG / HEIC / PNG / etc. — anything CIImage supports natively)
  // instead of CIRAWFilter, then follows the same per-ROI area-
  // average + linear-sRGB-render path. Photo pixels are already
  // WB-corrected + tone-curved by Apple's ISP; downstream WB stacks
  // on top of Apple's decisions.
  func decodePhotoRois(imagePath: String, rois: [Roi]) throws -> [LinearRgb] {
    let url = URL(fileURLWithPath: stripFileScheme(imagePath))
    guard let ciImage = loadPhotoCIImage(url: url) else {
      throw RuntimeError.error(
        withMessage: "CIImage could not open photo at \(url.path)")
    }
    return try decodeRoisFromCIImage(ciImage, rois: rois, tag: "decodePhotoRois")
  }

  // Photo-file variant of readPreviewRgb. Same shape (interleaved
  // 3-byte-per-pixel sRGB, sourceWidth/Height back-annotated) so
  // callers can share downstream code. Caveat: photo pixels are
  // Apple-ISP-processed, so treat linear-sRGB values as illustrative
  // more than absolute for tone-sensitive comparisons.
  func readPreviewRgbPhoto(imagePath: String, maxDim: Double) throws
    -> PreviewRgb
  {
    let url = URL(fileURLWithPath: stripFileScheme(imagePath))
    guard let ciImage = loadPhotoCIImage(url: url) else {
      throw RuntimeError.error(
        withMessage: "CIImage could not open photo at \(url.path)")
    }
    return try renderPreviewRgbFromCIImage(ciImage, maxDim: maxDim)
  }

  // Load a photo file as CIImage, respecting its stored orientation
  // tag so a phone-portrait JPEG comes out portrait (not sensor-
  // landscape). CIImage's default init does NOT auto-apply
  // orientation; we read the tag from the file's properties and use
  // `.oriented(_:)` to bake it in.
  private func loadPhotoCIImage(url: URL) -> CIImage? {
    guard let base = CIImage(contentsOf: url) else { return nil }
    if let src = CGImageSourceCreateWithURL(url as CFURL, nil),
      let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil)
        as? [CFString: Any],
      let orientationRaw = props[kCGImagePropertyOrientation] as? UInt32,
      let orientation = CGImagePropertyOrientation(rawValue: orientationRaw)
    {
      return base.oriented(orientation)
    }
    return base
  }

  // Shared per-ROI decode: given a CIImage already in the caller's
  // preferred orientation, run area-average per ROI and render each
  // to a 1×1 float RGBA bitmap in linear-sRGB working space.
  private func decodeRoisFromCIImage(
    _ ciImage: CIImage, rois: [Roi], tag: String
  ) throws -> [LinearRgb] {
    let extent = ciImage.extent
    NSLog(
      "DngDecoder [\(tag)]: CIImage extent = \(Int(extent.width))x\(Int(extent.height))"
    )
    guard let linearSpace = CGColorSpace(name: CGColorSpace.linearSRGB) else {
      throw RuntimeError.error(withMessage: "linearSRGB color space unavailable")
    }
    let context = CIContext(options: [
      .workingColorSpace: linearSpace,
      .outputColorSpace: linearSpace,
    ])
    var results: [LinearRgb] = []
    results.reserveCapacity(rois.count)
    for roi in rois {
      let cropRect = CGRect(
        x: extent.minX + CGFloat(roi.x),
        y: extent.maxY - CGFloat(roi.y + roi.h),
        width: CGFloat(roi.w),
        height: CGFloat(roi.h)
      )
      let cropped = ciImage.cropped(to: cropRect)
      let avg = CIFilter.areaAverage()
      avg.inputImage = cropped
      avg.extent = cropRect
      guard let averaged = avg.outputImage else {
        throw RuntimeError.error(
          withMessage: "CIAreaAverage produced no output for ROI")
      }
      var bitmap: [Float] = [0, 0, 0, 0]
      context.render(
        averaged,
        toBitmap: &bitmap,
        rowBytes: MemoryLayout<Float>.size * 4,
        bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
        format: .RGBAf,
        colorSpace: linearSpace
      )
      results.append(
        LinearRgb(
          r: clamp01(Double(bitmap[0])),
          g: clamp01(Double(bitmap[1])),
          b: clamp01(Double(bitmap[2]))
        ))
    }
    return results
  }

  // Shared preview-RGB renderer: given a CIImage already in the
  // caller's preferred orientation, scale-to-fit maxDim and render
  // as interleaved 3-byte-per-pixel sRGB bytes with sourceWidth /
  // sourceHeight back-annotated for the caller to reconstruct pixel-
  // to-preview scaling.
  private func renderPreviewRgbFromCIImage(
    _ ciImage: CIImage, maxDim: Double
  ) throws -> PreviewRgb {
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

  // Shared pre-decode config for every CIRAWFilter entry point.
  // `boostAmount` / `boostShadowAmount` = 0 disable Apple's default
  // tone shaping so the RAW pipeline stays as linear as possible.
  //
  // orientation = .right forces portrait output on every capture,
  // regardless of what the DNG's Orientation EXIF tag says. The tag
  // has been observed to flip between captures (probably vision-
  // camera reconfiguring on prop changes and iOS re-deriving the
  // capture-time orientation from stale state), causing the same
  // capture pipeline to produce either portrait or landscape frames.
  // Since the chart validator (and every other current caller) shoots
  // phone-held-portrait, .right — which tells CIRAWFilter "the raw
  // data was captured with a right-side rotation, apply 90° CCW to
  // upright" — gives consistent portrait output. If we ever add a
  // caller that legitimately shoots landscape, thread the desired
  // orientation through as a parameter.
  //
  // Log the stored tag alongside the forced override so any future
  // capture-orientation debugging has a paper trail.
  private func configureRawFilter(
    _ rawFilter: CIRAWFilter, url: URL, tag: String
  ) {
    rawFilter.boostAmount = 0.0
    rawFilter.boostShadowAmount = 0.0
    let stored = readDngOrientation(url: url)
    let storedName = stored.map(orientationName) ?? "nil"
    NSLog(
      "DngDecoder [\(tag)]: DNG stored orientation=\(storedName), "
        + "forcing filter.orientation=.right (portrait)")
    rawFilter.orientation = .right
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

  func extractDngPreviewJpeg(dngPath: String) throws -> String {
    let srcPath = stripFileScheme(dngPath)
    let srcUrl = URL(fileURLWithPath: srcPath)

    guard
      let src = CGImageSourceCreateWithURL(srcUrl as CFURL, nil)
    else {
      throw RuntimeError.error(
        withMessage: "CGImageSourceCreateWithURL failed for \(srcPath)")
    }
    let count = CGImageSourceGetCount(src)
    guard count > 0 else {
      throw RuntimeError.error(
        withMessage: "DNG has no images: \(srcPath)")
    }

    // AVCapturePhoto lays out an iOS RAW DNG as:
    //   image 0: RAW Bayer data (huge, not JPEG)
    //   image 1+: full-resolution Apple-processed JPEG preview(s)
    // Pick the largest image that ImageIO actually reports as a
    // JPEG-flavoured UTI — safer than blind index 1 in case an
    // iOS release rearranges the layout.
    var bestIdx = -1
    var bestPixels = 0
    for i in 0..<count {
      guard
        let props = CGImageSourceCopyPropertiesAtIndex(src, i, nil)
          as? [CFString: Any]
      else { continue }
      let w = (props[kCGImagePropertyPixelWidth] as? Int) ?? 0
      let h = (props[kCGImagePropertyPixelHeight] as? Int) ?? 0
      let pixels = w * h
      // ImageIO reports subimage UTIs via CGImageSourceGetType on the
      // subsource, but the per-index API takes a different shape.
      // Instead check that the sub-image is NOT raw — RAW subimages
      // are flagged in the properties dict.
      let isRaw =
        (props[kCGImagePropertyIsRawImage] as? Bool) ?? false
      if isRaw { continue }
      if pixels > bestPixels {
        bestPixels = pixels
        bestIdx = i
      }
    }
    guard bestIdx >= 0 else {
      throw RuntimeError.error(
        withMessage:
          "no non-RAW preview subimage found in DNG (\(count) subimages)")
    }

    // Copy the JPEG bytes out losslessly with a JPEG destination.
    // Uses the subimage's existing JPEG data if the type matches,
    // avoiding a re-encode.
    let dstPath = (srcPath as NSString).deletingPathExtension + ".jpg"
    let dstUrl = URL(fileURLWithPath: dstPath)
    // Remove any prior file at that path so CGImageDestinationFinalize
    // doesn't fail silently.
    try? FileManager.default.removeItem(at: dstUrl)

    guard
      let dst = CGImageDestinationCreateWithURL(
        dstUrl as CFURL, "public.jpeg" as CFString, 1, nil)
    else {
      throw RuntimeError.error(
        withMessage: "CGImageDestinationCreateWithURL failed for \(dstPath)")
    }
    // Passing nil options tells ImageIO to preserve the source
    // encoding when the source is already JPEG — no re-encode, no
    // quality loss. If the source subimage isn't already JPEG (would
    // be surprising for iOS-captured DNGs but not impossible),
    // ImageIO will encode at default quality.
    CGImageDestinationAddImageFromSource(dst, src, bestIdx, nil)
    guard CGImageDestinationFinalize(dst) else {
      throw RuntimeError.error(
        withMessage: "CGImageDestinationFinalize failed for \(dstPath)")
    }

    let sizeBytes = (try? FileManager.default.attributesOfItem(atPath: dstPath)[.size] as? Int) ?? 0
    NSLog(
      "DngDecoder: extracted preview JPEG %dx%d (%d bytes) to %@",
      Int(sqrt(Double(bestPixels))), Int(sqrt(Double(bestPixels))),
      sizeBytes, dstPath)
    return dstPath
  }
}
