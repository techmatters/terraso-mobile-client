// dng-cli — standalone macOS binary that mirrors the iOS
// HybridDngDecoder path so device and Node analysis paths sample the
// same pixels.
//
// Subcommands:
//   decode-dng-rois <dngPath> <roisJson>
//       roisJson is a JSON array of {x,y,w,h} top-left-origin
//       rectangles in full-sensor pixel coords. Output is a JSON array
//       of {r,g,b} linear-sRGB triples in [0,1], one per input ROI,
//       printed to stdout.
//   read-preview-rgb <dngPath> <maxDim> <outRgbPath>
//       Renders the DNG through CIRAWFilter and downscales to fit
//       maxDim (preserving aspect). Writes raw interleaved 3-byte-
//       per-pixel sRGB bytes to <outRgbPath>. Prints JSON header
//       {"width", "height", "sourceWidth", "sourceHeight"} to stdout.
//   render-preview <dngPath> <maxDim> <outPath> [<jpegQuality>]
//       Same rendering pipeline as read-preview-rgb but writes an
//       encoded image file. Format inferred from <outPath> extension:
//       .png (lossless) or .jpg/.jpeg (JPEG, default quality 85 or
//       whatever <jpegQuality> in 1-100 says). Prints JSON header
//       {"width", "height", "sourceWidth", "sourceHeight"} to stdout.
//
// Errors go to stderr; non-zero exit on failure.

import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct Roi: Decodable {
  let x: Int
  let y: Int
  let w: Int
  let h: Int
}

struct LinearRgb: Encodable {
  let r: Double
  let g: Double
  let b: Double
}

// Mirror of the C++ CLI's per-ROI output shape: `r/g/b` = per-channel
// mean, `dominantR/dominantG/dominantB` = median-cut "biggest cluster".
// The Apple CIRAWFilter path only computes the mean, so the dominant
// fields are emitted equal to the mean as a placeholder — keeps the
// JSON schema stable for the analyzer.
struct LinearRgbReduced: Encodable {
  let r: Double
  let g: Double
  let b: Double
  let dominantR: Double
  let dominantG: Double
  let dominantB: Double
}

enum CliError: Error {
  case msg(String)
}

func stripFileScheme(_ path: String) -> String {
  path.hasPrefix("file://")
    ? String(path.dropFirst("file://".count))
    : path
}

func clamp01(_ v: Double) -> Double {
  max(0.0, min(1.0, v))
}

// Same CIRAWFilter config the iOS decoder uses. boostAmount /
// boostShadowAmount = 0 keeps the pipeline linear (no Apple tone
// shaping). orientation = .right forces portrait output to match
// on-device captures shot phone-held-portrait.
func configureRawFilter(_ rawFilter: CIRAWFilter) {
  rawFilter.boostAmount = 0.0
  rawFilter.boostShadowAmount = 0.0
  rawFilter.orientation = .right
}

// Given an already-loaded CIImage (from either the RAW or the photo
// path), decode per-ROI averaged colour in the linear-sRGB working
// space. Split out so decodeDngRois and decodePhotoRois can share it.
func decodeCiImageRois(_ ciImage: CIImage, rois: [Roi]) throws -> [LinearRgb] {
  let extent = ciImage.extent
  guard let linearSpace = CGColorSpace(name: CGColorSpace.linearSRGB) else {
    throw CliError.msg("linearSRGB color space unavailable")
  }
  let context = CIContext(options: [
    .workingColorSpace: linearSpace,
    .outputColorSpace: linearSpace,
  ])

  var results: [LinearRgb] = []
  results.reserveCapacity(rois.count)
  for roi in rois {
    // ROI coords are top-left origin. CoreImage's is bottom-left,
    // Y increasing upward — so flip Y here.
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
      throw CliError.msg("CIAreaAverage produced no output for ROI")
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

func decodeDngRois(dngPath: String, rois: [Roi]) throws -> [LinearRgb] {
  let url = URL(fileURLWithPath: stripFileScheme(dngPath))
  guard let rawFilter = CIRAWFilter(imageURL: url) else {
    throw CliError.msg("CIRAWFilter could not open DNG at \(url.path)")
  }
  configureRawFilter(rawFilter)
  guard let ciImage = rawFilter.outputImage else {
    throw CliError.msg("CIRAWFilter produced no outputImage")
  }
  return try decodeCiImageRois(ciImage, rois: rois)
}

// Load a JPEG/HEIC/PNG file as a CIImage in the same fixed orientation
// the DNG path produces: sensor-native pixels rotated 90° CW. The DNG
// decoder forces `rawFilter.orientation = .right` unconditionally
// (see decodeDng below and HybridDngDecoder on the mobile side), so
// its output orientation is invariant regardless of how the phone was
// held at capture. To keep raw + photo of the same shutter registered
// identically, this path must not apply the file's EXIF Orientation
// (which varies by phone attitude and would rotate 90°-1 JPEGs out of
// alignment with the DNG). Instead: decode pixels without EXIF then
// apply the same fixed .right rotation.
func loadPhotoAsCiImage(_ imagePath: String) throws -> CIImage {
  let url = URL(fileURLWithPath: stripFileScheme(imagePath))
  guard
    let ciImage = CIImage(
      contentsOf: url,
      options: [.applyOrientationProperty: false])
  else {
    throw CliError.msg("CIImage could not open photo at \(url.path)")
  }
  return ciImage.oriented(.right)
}

func decodePhotoRois(imagePath: String, rois: [Roi]) throws -> [LinearRgb] {
  let ciImage = try loadPhotoAsCiImage(imagePath)
  return try decodeCiImageRois(ciImage, rois: rois)
}

// Extract the Apple-ISP-processed JPEG preview embedded in an iOS
// DNG. Every AVCapturePhoto DNG carries a full-resolution JPEG as
// one of its subimages; ImageIO's CGImageDestinationAddImageFromSource
// copies it out byte-for-byte (no re-encode) to a sibling .jpg file.
// Returns the output path, or throws if no non-RAW preview subimage
// is found (rare for iOS DNGs; possible for DNGs from other sources).
func extractDngPreviewJpeg(dngPath: String, outPath: String?) throws
  -> String
{
  let srcPath = stripFileScheme(dngPath)
  let srcUrl = URL(fileURLWithPath: srcPath)
  guard
    let src = CGImageSourceCreateWithURL(srcUrl as CFURL, nil)
  else {
    throw CliError.msg(
      "CGImageSourceCreateWithURL failed for \(srcPath)")
  }
  let count = CGImageSourceGetCount(src)
  guard count > 0 else {
    throw CliError.msg("DNG has no images: \(srcPath)")
  }
  // iOS AVCapturePhoto DNG layout: index 0 is the RAW Bayer subimage
  // (CGImageSource can't decode it without CIRAWFilter); indices 1+
  // are the JPEG preview(s). Pick the largest non-index-0 by pixel
  // count so we grab a full-resolution preview even if there are
  // several thumbnails alongside it.
  var bestIdx = -1
  var bestPixels = 0
  let startIdx = count > 1 ? 1 : 0
  for i in startIdx..<count {
    guard
      let props = CGImageSourceCopyPropertiesAtIndex(src, i, nil)
        as? [CFString: Any]
    else { continue }
    let w = (props[kCGImagePropertyPixelWidth] as? Int) ?? 0
    let h = (props[kCGImagePropertyPixelHeight] as? Int) ?? 0
    let pixels = w * h
    if pixels > bestPixels {
      bestPixels = pixels
      bestIdx = i
    }
  }
  guard bestIdx >= 0 else {
    throw CliError.msg(
      "no non-RAW preview subimage in DNG (\(count) subimages)")
  }
  let dstPath =
    outPath.map(stripFileScheme)
    ?? ((srcPath as NSString).deletingPathExtension + ".jpg")
  let dstUrl = URL(fileURLWithPath: dstPath)
  try? FileManager.default.removeItem(at: dstUrl)
  guard
    let dst = CGImageDestinationCreateWithURL(
      dstUrl as CFURL, "public.jpeg" as CFString, 1, nil)
  else {
    throw CliError.msg(
      "CGImageDestinationCreateWithURL failed for \(dstPath)")
  }
  CGImageDestinationAddImageFromSource(dst, src, bestIdx, nil)
  guard CGImageDestinationFinalize(dst) else {
    throw CliError.msg(
      "CGImageDestinationFinalize failed for \(dstPath)")
  }
  return dstPath
}

struct PreviewRgbHeader: Encodable {
  let width: Int
  let height: Int
  let sourceWidth: Int
  let sourceHeight: Int
}

// Preview-writer core: given a source CIImage, scale to fit maxDim,
// render as sRGB 8-bit RGB, and write interleaved rgb bytes to the
// out path. Shared between the DNG and photo variants.
func writeScaledPreviewRgb(
  _ ciImage: CIImage, maxDim: Double, outRgbPath: String
) throws -> PreviewRgbHeader {
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

  // Render in gamma-encoded sRGB — same numeric convention as the iOS
  // readPreviewRgb path, so JS-side CV thresholds match device runs.
  guard let displaySpace = CGColorSpace(name: CGColorSpace.sRGB) else {
    throw CliError.msg("sRGB color space unavailable")
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
    throw CliError.msg("CIContext.createCGImage returned nil")
  }

  // Draw to a 4-byte-per-pixel RGBA scratch buffer via a hand-rolled
  // CGContext, then compact to 3-byte-per-pixel interleaved (dropping
  // alpha) — matches the Nitro PreviewRgb layout expected by JS.
  let bytesPerRow = dstW * 4
  var rgba = [UInt8](repeating: 0, count: bytesPerRow * dstH)
  let bitmapInfo: UInt32 =
    CGBitmapInfo.byteOrder32Big.rawValue
    | CGImageAlphaInfo.premultipliedLast.rawValue
  guard
    let ctx = CGContext(
      data: &rgba, width: dstW, height: dstH, bitsPerComponent: 8,
      bytesPerRow: bytesPerRow, space: displaySpace, bitmapInfo: bitmapInfo)
  else {
    throw CliError.msg("CGContext allocation failed")
  }
  ctx.draw(cgImage, in: CGRect(x: 0, y: 0, width: dstW, height: dstH))

  let pixelCount = dstW * dstH
  var rgb = [UInt8](repeating: 0, count: pixelCount * 3)
  for i in 0..<pixelCount {
    rgb[i * 3] = rgba[i * 4]
    rgb[i * 3 + 1] = rgba[i * 4 + 1]
    rgb[i * 3 + 2] = rgba[i * 4 + 2]
  }
  let outUrl = URL(fileURLWithPath: stripFileScheme(outRgbPath))
  do {
    try Data(rgb).write(to: outUrl, options: .atomic)
  } catch {
    throw CliError.msg(
      "failed to write preview rgb to \(outUrl.path): \(error.localizedDescription)"
    )
  }
  return PreviewRgbHeader(
    width: dstW, height: dstH,
    sourceWidth: sourceWidth, sourceHeight: sourceHeight)
}

func readPreviewRgb(dngPath: String, maxDim: Double, outRgbPath: String) throws
  -> PreviewRgbHeader
{
  let url = URL(fileURLWithPath: stripFileScheme(dngPath))
  guard let rawFilter = CIRAWFilter(imageURL: url) else {
    throw CliError.msg("CIRAWFilter could not open DNG at \(url.path)")
  }
  configureRawFilter(rawFilter)
  guard let ciImage = rawFilter.outputImage else {
    throw CliError.msg("CIRAWFilter produced no outputImage")
  }
  return try writeScaledPreviewRgb(
    ciImage, maxDim: maxDim, outRgbPath: outRgbPath)
}

func readPreviewRgbPhoto(
  imagePath: String, maxDim: Double, outRgbPath: String
) throws -> PreviewRgbHeader {
  let ciImage = try loadPhotoAsCiImage(imagePath)
  return try writeScaledPreviewRgb(
    ciImage, maxDim: maxDim, outRgbPath: outRgbPath)
}

// Shared "decode + scale-to-fit" step used by read-preview-rgb and
// render-preview. Returns the scaled CIImage plus the destination
// dims (rounded) and full-sensor source dims.
struct ScaledPreview {
  let image: CIImage
  let width: Int
  let height: Int
  let sourceWidth: Int
  let sourceHeight: Int
}

func loadAndScaleDng(dngPath: String, maxDim: Double) throws -> ScaledPreview {
  let url = URL(fileURLWithPath: stripFileScheme(dngPath))
  guard let rawFilter = CIRAWFilter(imageURL: url) else {
    throw CliError.msg("CIRAWFilter could not open DNG at \(url.path)")
  }
  configureRawFilter(rawFilter)
  guard let ciImage = rawFilter.outputImage else {
    throw CliError.msg("CIRAWFilter produced no outputImage")
  }
  let srcW = ciImage.extent.width
  let srcH = ciImage.extent.height
  let maxDimCG = CGFloat(maxDim)
  let scale = min(maxDimCG / srcW, maxDimCG / srcH, 1.0)
  let scaled: CIImage =
    scale < 1.0
    ? ciImage.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    : ciImage
  return ScaledPreview(
    image: scaled,
    width: Int(scaled.extent.width.rounded()),
    height: Int(scaled.extent.height.rounded()),
    sourceWidth: Int(srcW.rounded()),
    sourceHeight: Int(srcH.rounded())
  )
}

func loadAndScalePhoto(imagePath: String, maxDim: Double) throws
  -> ScaledPreview
{
  let ciImage = try loadPhotoAsCiImage(imagePath)
  let srcW = ciImage.extent.width
  let srcH = ciImage.extent.height
  let maxDimCG = CGFloat(maxDim)
  let scale = min(maxDimCG / srcW, maxDimCG / srcH, 1.0)
  let scaled: CIImage =
    scale < 1.0
    ? ciImage.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    : ciImage
  return ScaledPreview(
    image: scaled,
    width: Int(scaled.extent.width.rounded()),
    height: Int(scaled.extent.height.rounded()),
    sourceWidth: Int(srcW.rounded()),
    sourceHeight: Int(srcH.rounded())
  )
}

// Take a ScaledPreview (from either loadAndScaleDng or
// loadAndScalePhoto) and write it as a jpg/png at outPath.
func writeScaledPreviewFile(
  _ scaled: ScaledPreview, outPath: String, jpegQuality: Double
) throws -> PreviewRgbHeader {
  // sRGB (gamma-encoded) output space — display-ready pixels.
  guard let displaySpace = CGColorSpace(name: CGColorSpace.sRGB) else {
    throw CliError.msg("sRGB color space unavailable")
  }
  let context = CIContext(options: [
    .workingColorSpace: displaySpace,
    .outputColorSpace: displaySpace,
  ])
  guard
    let cgImage = context.createCGImage(
      scaled.image, from: scaled.image.extent, format: .RGBA8,
      colorSpace: displaySpace)
  else {
    throw CliError.msg("CIContext.createCGImage returned nil")
  }

  let outUrl = URL(fileURLWithPath: stripFileScheme(outPath))
  let ext = outUrl.pathExtension.lowercased()
  let (utType, options): (UTType, [CFString: Any])
  switch ext {
  case "jpg", "jpeg":
    utType = .jpeg
    options = [kCGImageDestinationLossyCompressionQuality: jpegQuality]
  case "png":
    utType = .png
    options = [:]
  default:
    throw CliError.msg(
      "render-preview: unrecognized output extension .\(ext) (use .jpg/.jpeg/.png)"
    )
  }
  guard
    let dest = CGImageDestinationCreateWithURL(
      outUrl as CFURL, utType.identifier as CFString, 1, nil)
  else {
    throw CliError.msg(
      "CGImageDestinationCreateWithURL failed for \(outUrl.path)")
  }
  CGImageDestinationAddImage(dest, cgImage, options as CFDictionary)
  guard CGImageDestinationFinalize(dest) else {
    throw CliError.msg(
      "CGImageDestinationFinalize failed writing to \(outUrl.path)")
  }
  return PreviewRgbHeader(
    width: scaled.width, height: scaled.height,
    sourceWidth: scaled.sourceWidth, sourceHeight: scaled.sourceHeight)
}

func renderPreviewFile(
  dngPath: String, maxDim: Double, outPath: String, jpegQuality: Double
) throws -> PreviewRgbHeader {
  let scaled = try loadAndScaleDng(dngPath: dngPath, maxDim: maxDim)
  return try writeScaledPreviewFile(
    scaled, outPath: outPath, jpegQuality: jpegQuality)
}

func renderPreviewPhotoFile(
  imagePath: String, maxDim: Double, outPath: String, jpegQuality: Double
) throws -> PreviewRgbHeader {
  let scaled = try loadAndScalePhoto(imagePath: imagePath, maxDim: maxDim)
  return try writeScaledPreviewFile(
    scaled, outPath: outPath, jpegQuality: jpegQuality)
}

func die(_ msg: String) -> Never {
  FileHandle.standardError.write(Data((msg + "\n").utf8))
  exit(1)
}

func writeJson<T: Encodable>(_ value: T) {
  let encoder = JSONEncoder()
  encoder.outputFormatting = [.withoutEscapingSlashes]
  do {
    let data = try encoder.encode(value)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
  } catch {
    die("failed to encode json: \(error.localizedDescription)")
  }
}

let args = CommandLine.arguments
guard args.count >= 2 else {
  die(
    "usage: dng-cli <subcommand> …\n"
      + "  decode-dng-rois <dngPath> <roisJson>\n"
      + "  decode-photo-rois <imagePath> <roisJson>\n"
      + "  read-preview-rgb <dngPath> <maxDim> <outRgbPath>\n"
      + "  read-preview-rgb-photo <imagePath> <maxDim> <outRgbPath>\n"
      + "  render-preview <dngPath> <maxDim> <outPath> [<jpegQuality>]\n"
      + "  render-preview-photo <imagePath> <maxDim> <outPath> [<jpegQuality>]\n"
      + "  extract-dng-preview-jpeg <dngPath> [<outJpegPath>]")
}
let cmd = args[1]

switch cmd {
case "decode-dng-rois":
  guard args.count >= 4 else {
    die("usage: dng-cli decode-dng-rois <dngPath> <roisJson>")
  }
  let dngPath = args[2]
  let roisJson = args[3]
  let rois: [Roi]
  do {
    rois = try JSONDecoder().decode([Roi].self, from: Data(roisJson.utf8))
  } catch {
    die("failed to parse rois json: \(error.localizedDescription)")
  }
  let results: [LinearRgb]
  do {
    results = try decodeDngRois(dngPath: dngPath, rois: rois)
  } catch CliError.msg(let m) {
    die(m)
  } catch {
    die("unexpected error: \(error.localizedDescription)")
  }
  // Emit mean AND placeholder-dominant fields so downstream parsers see
  // the same schema as the C++ CLI (see LinearRgbReduced above).
  let reduced = results.map {
    LinearRgbReduced(
      r: $0.r, g: $0.g, b: $0.b,
      dominantR: $0.r, dominantG: $0.g, dominantB: $0.b)
  }
  writeJson(reduced)

case "read-preview-rgb":
  guard args.count >= 5 else {
    die("usage: dng-cli read-preview-rgb <dngPath> <maxDim> <outRgbPath>")
  }
  let dngPath = args[2]
  guard let maxDim = Double(args[3]) else {
    die("maxDim must be a number, got: \(args[3])")
  }
  let outRgbPath = args[4]
  let header: PreviewRgbHeader
  do {
    header = try readPreviewRgb(
      dngPath: dngPath, maxDim: maxDim, outRgbPath: outRgbPath)
  } catch CliError.msg(let m) {
    die(m)
  } catch {
    die("unexpected error: \(error.localizedDescription)")
  }
  writeJson(header)

case "decode-photo-rois":
  guard args.count >= 4 else {
    die("usage: dng-cli decode-photo-rois <imagePath> <roisJson>")
  }
  let imagePath = args[2]
  let roisJson = args[3]
  let rois: [Roi]
  do {
    rois = try JSONDecoder().decode([Roi].self, from: Data(roisJson.utf8))
  } catch {
    die("failed to parse rois json: \(error.localizedDescription)")
  }
  let results: [LinearRgb]
  do {
    results = try decodePhotoRois(imagePath: imagePath, rois: rois)
  } catch CliError.msg(let m) {
    die(m)
  } catch {
    die("unexpected error: \(error.localizedDescription)")
  }
  let reduced = results.map {
    LinearRgbReduced(
      r: $0.r, g: $0.g, b: $0.b,
      dominantR: $0.r, dominantG: $0.g, dominantB: $0.b)
  }
  writeJson(reduced)

case "read-preview-rgb-photo":
  guard args.count >= 5 else {
    die(
      "usage: dng-cli read-preview-rgb-photo <imagePath> <maxDim> <outRgbPath>"
    )
  }
  let imagePath = args[2]
  guard let maxDim = Double(args[3]) else {
    die("maxDim must be a number, got: \(args[3])")
  }
  let outRgbPath = args[4]
  let header: PreviewRgbHeader
  do {
    header = try readPreviewRgbPhoto(
      imagePath: imagePath, maxDim: maxDim, outRgbPath: outRgbPath)
  } catch CliError.msg(let m) {
    die(m)
  } catch {
    die("unexpected error: \(error.localizedDescription)")
  }
  writeJson(header)

case "render-preview":
  guard args.count >= 5 else {
    die(
      "usage: dng-cli render-preview <dngPath> <maxDim> <outPath> [<jpegQuality>]"
    )
  }
  let dngPath = args[2]
  guard let maxDim = Double(args[3]) else {
    die("maxDim must be a number, got: \(args[3])")
  }
  let outPath = args[4]
  let jpegQuality: Double
  if args.count >= 6 {
    guard let q = Double(args[5]), q >= 1, q <= 100 else {
      die("jpegQuality must be a number in 1..100, got: \(args[5])")
    }
    jpegQuality = q / 100.0
  } else {
    jpegQuality = 0.85
  }
  let header: PreviewRgbHeader
  do {
    header = try renderPreviewFile(
      dngPath: dngPath, maxDim: maxDim, outPath: outPath,
      jpegQuality: jpegQuality)
  } catch CliError.msg(let m) {
    die(m)
  } catch {
    die("unexpected error: \(error.localizedDescription)")
  }
  writeJson(header)

case "extract-dng-preview-jpeg":
  guard args.count >= 3 else {
    die(
      "usage: dng-cli extract-dng-preview-jpeg <dngPath> [<outJpegPath>]"
    )
  }
  let dngPath = args[2]
  let outPath: String? = args.count >= 4 ? args[3] : nil
  let written: String
  do {
    written = try extractDngPreviewJpeg(dngPath: dngPath, outPath: outPath)
  } catch CliError.msg(let m) {
    die(m)
  } catch {
    die("unexpected error: \(error.localizedDescription)")
  }
  // Emit the resulting path as raw text so shell callers can pipe it
  // straight into other commands, matching the Node adapter's
  // extractDngPreviewJpeg convention.
  print(written)

case "render-preview-photo":
  guard args.count >= 5 else {
    die(
      "usage: dng-cli render-preview-photo <imagePath> <maxDim> <outPath> [<jpegQuality>]"
    )
  }
  let imagePath = args[2]
  guard let maxDim = Double(args[3]) else {
    die("maxDim must be a number, got: \(args[3])")
  }
  let outPath = args[4]
  let jpegQuality: Double
  if args.count >= 6 {
    guard let q = Double(args[5]), q >= 1, q <= 100 else {
      die("jpegQuality must be a number in 1..100, got: \(args[5])")
    }
    jpegQuality = q / 100.0
  } else {
    jpegQuality = 0.85
  }
  let header: PreviewRgbHeader
  do {
    header = try renderPreviewPhotoFile(
      imagePath: imagePath, maxDim: maxDim, outPath: outPath,
      jpegQuality: jpegQuality)
  } catch CliError.msg(let m) {
    die(m)
  } catch {
    die("unexpected error: \(error.localizedDescription)")
  }
  writeJson(header)

default:
  die("unknown command: \(cmd)")
}
