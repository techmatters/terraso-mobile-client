// dng-cli — standalone macOS binary that decodes DNG regions via
// CIRAWFilter, mirroring the iOS HybridDngDecoder.decodeDngRois path
// so device and Node analysis paths sample the same pixels.
//
// Usage:
//   dng-cli decode-dng-rois <dngPath> <roisJson>
//
// roisJson is a JSON array of {x,y,w,h} top-left-origin rectangles in
// full-sensor pixel coords. Output is a JSON array of {r,g,b} linear-
// sRGB triples in [0,1], one per input ROI, printed to stdout.
//
// Errors go to stderr; non-zero exit on failure.

import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation

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

func decodeDngRois(dngPath: String, rois: [Roi]) throws -> [LinearRgb] {
  let url = URL(fileURLWithPath: stripFileScheme(dngPath))
  guard let rawFilter = CIRAWFilter(imageURL: url) else {
    throw CliError.msg("CIRAWFilter could not open DNG at \(url.path)")
  }
  configureRawFilter(rawFilter)
  guard let ciImage = rawFilter.outputImage else {
    throw CliError.msg("CIRAWFilter produced no outputImage")
  }
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

func die(_ msg: String) -> Never {
  FileHandle.standardError.write(Data((msg + "\n").utf8))
  exit(1)
}

let args = CommandLine.arguments
guard args.count >= 4 else {
  die("usage: dng-cli decode-dng-rois <dngPath> <roisJson>")
}
let cmd = args[1]
guard cmd == "decode-dng-rois" else {
  die("unknown command: \(cmd)")
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

let encoder = JSONEncoder()
encoder.outputFormatting = [.withoutEscapingSlashes]
do {
  let data = try encoder.encode(results)
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write(Data("\n".utf8))
} catch {
  die("failed to encode results json: \(error.localizedDescription)")
}
