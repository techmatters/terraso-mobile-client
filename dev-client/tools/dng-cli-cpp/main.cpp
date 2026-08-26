// dng-cli-cpp — mac-hosted CLI wrapper around the same C++ DNG decoder
// (modules/dng-decoder/cpp/) that the Android RawCameraAndroid module
// runs on-device via JNI. Exists so scripts/analyze-fixtures.ts can
// process Android-captured DNGs through EXACTLY the code path the
// phone used, instead of routing through Apple's CIRAWFilter (which
// would give an "Apple decoding an Android capture" mismatch and
// invalidate the whole raw-vs-jpeg A/B measurement).
//
// Subcommands + output shapes match the Swift dng-cli one-to-one so
// analyze-fixtures can pick the CLI by source-platform token from the
// filename ("_IOS_" → dng-cli, "_ANDROID_" → dng-cli-cpp) without any
// further branching downstream.
//
// Subcommands implemented:
//   decode-dng-rois         <dngPath> <roisJson>
//   decode-dng-rois-batch   <dngPath> <nestedRoisJson>
//   read-preview-rgb        <dngPath> <maxDim> <outRgbPath>
//   read-metadata           <dngPath>
//
// decode-dng-rois-batch is a mac-only optimisation for the analyzer's
// multi-card sweep — accepts many candidate ROI sets in one process
// invocation so parseDng runs once for the whole batch instead of
// per-candidate. Not mirrored to iOS/Android on-device (single-shot
// paths don't benefit).
//
// See docs/android-raw-path.md for the full motivation.

#include "DngDecoderC.h"

#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <string>
#include <vector>

namespace {

[[noreturn]] void die(const std::string& msg) {
  std::fputs(msg.c_str(), stderr);
  std::fputs("\n", stderr);
  std::exit(1);
}

std::string readFilePath(const std::string& p) {
  // Strip file:// prefix if present so the C decoder gets a plain path.
  const std::string scheme = "file://";
  if (p.rfind(scheme, 0) == 0) return p.substr(scheme.size());
  return p;
}

// Minimal handwritten parser for the ROI JSON — format is fixed:
//   [{"x":123,"y":456,"w":789,"h":012}, ...]
// Whitespace tolerant. Numbers can be int or float; we round to int
// since ROIs are pixel coordinates.
struct Roi {
  int32_t x, y, w, h;
};

bool skipWs(const char*& p) {
  while (*p == ' ' || *p == '\t' || *p == '\n' || *p == '\r') ++p;
  return true;
}

bool consume(const char*& p, char c) {
  skipWs(p);
  if (*p != c) return false;
  ++p;
  return true;
}

bool parseNumber(const char*& p, int32_t& out) {
  skipWs(p);
  char* end = nullptr;
  double v = std::strtod(p, &end);
  if (end == p) return false;
  p = end;
  out = static_cast<int32_t>(v < 0 ? v - 0.5 : v + 0.5);
  return true;
}

bool parseKey(const char*& p, const char* expected) {
  skipWs(p);
  if (*p != '"') return false;
  ++p;
  size_t len = std::strlen(expected);
  if (std::strncmp(p, expected, len) != 0) return false;
  p += len;
  if (*p != '"') return false;
  ++p;
  return consume(p, ':');
}

std::vector<Roi> parseRoisJson(const std::string& s) {
  std::vector<Roi> out;
  const char* p = s.c_str();
  if (!consume(p, '[')) die("rois json: expected '['");
  skipWs(p);
  if (*p == ']') return out;
  for (;;) {
    if (!consume(p, '{')) die("rois json: expected '{'");
    Roi r{};
    // Fields can appear in any order; parse until '}'.
    for (int i = 0; i < 4; i++) {
      skipWs(p);
      if (*p != '"') die("rois json: expected key");
      const char* keyStart = ++p;
      while (*p && *p != '"') ++p;
      if (*p != '"') die("rois json: unterminated key");
      std::string key(keyStart, p - keyStart);
      ++p;
      if (!consume(p, ':')) die("rois json: expected ':'");
      int32_t v;
      if (!parseNumber(p, v)) die("rois json: bad number");
      if (key == "x") r.x = v;
      else if (key == "y") r.y = v;
      else if (key == "w") r.w = v;
      else if (key == "h") r.h = v;
      else die("rois json: unknown key " + key);
      skipWs(p);
      if (*p == ',') { ++p; continue; }
      if (*p == '}') break;
      die("rois json: expected ',' or '}'");
    }
    if (!consume(p, '}')) die("rois json: expected '}'");
    out.push_back(r);
    skipWs(p);
    if (*p == ',') { ++p; continue; }
    if (*p == ']') { ++p; break; }
    die("rois json: expected ',' or ']'");
  }
  return out;
}

// Cheap JSON-writer helpers — no library dependency.
void writeDouble(std::string& out, double v) {
  char buf[64];
  std::snprintf(buf, sizeof(buf), "%.10g", v);
  out += buf;
}

// Parse `[[roi, roi, ...], [roi, roi, ...], ...]` — an array whose
// entries are themselves ROI arrays (each in the same format
// parseRoisJson accepts). Used by decode-dng-rois-batch. Each inner
// list corresponds to one "candidate" (e.g. one position tried by
// the analyzer's multi-card sweep), so callers can pass N × M ROIs
// in one process invocation and pay the parseDng fixed cost once.
std::vector<std::vector<Roi>> parseNestedRoisJson(const std::string& s) {
  std::vector<std::vector<Roi>> out;
  const char* p = s.c_str();
  if (!consume(p, '[')) die("nested rois json: expected outer '['");
  skipWs(p);
  if (*p == ']') return out;
  for (;;) {
    skipWs(p);
    if (*p != '[') die("nested rois json: expected inner '['");
    // Find the matching inner ']' and hand that slice to
    // parseRoisJson. Bracket-balanced scan handles nested {} inside
    // ROI objects without needing a full recursive-descent parser.
    const char* start = p;
    int depth = 0;
    do {
      if (*p == '[') depth++;
      else if (*p == ']') depth--;
      ++p;
    } while (depth > 0 && *p);
    if (depth != 0) die("nested rois json: unbalanced inner brackets");
    out.push_back(parseRoisJson(std::string(start, p - start)));
    skipWs(p);
    if (*p == ',') { ++p; continue; }
    if (*p == ']') { ++p; break; }
    die("nested rois json: expected ',' or ']' after inner list");
  }
  return out;
}

int cmdDecodeDngRois(int argc, char** argv) {
  if (argc < 4) die("usage: dng-cli-cpp decode-dng-rois <dngPath> <roisJson>");
  const std::string path = readFilePath(argv[2]);
  const std::string roisJson = argv[3];
  const std::vector<Roi> rois = parseRoisJson(roisJson);

  // Flatten ROIs into int32 quads for the C ABI.
  std::vector<int32_t> flat(rois.size() * 4);
  for (size_t i = 0; i < rois.size(); i++) {
    flat[i * 4 + 0] = rois[i].x;
    flat[i * 4 + 1] = rois[i].y;
    flat[i * 4 + 2] = rois[i].w;
    flat[i * 4 + 3] = rois[i].h;
  }
  // Reduced form: mean + dominant. The mean is byte-identical to what
  // the old dngDecoderDecodeRois returned, so the `r`/`g`/`b` fields
  // stay stable for callers that don't yet parse the dominant fields.
  const size_t n = rois.size();
  std::vector<double> mR(n), mG(n), mB(n), dR(n), dG(n), dB(n);
  const char* err = nullptr;
  if (!dngDecoderDecodeRoisReduced(path.c_str(), flat.data(),
                                   static_cast<int32_t>(n), mR.data(),
                                   mG.data(), mB.data(), dR.data(),
                                   dG.data(), dB.data(), &err)) {
    die(std::string("dngDecoderDecodeRoisReduced failed: ") +
        (err ? err : "unknown"));
  }
  std::string out = "[";
  for (size_t i = 0; i < n; i++) {
    if (i) out += ",";
    out += "{\"r\":";
    writeDouble(out, mR[i]);
    out += ",\"g\":";
    writeDouble(out, mG[i]);
    out += ",\"b\":";
    writeDouble(out, mB[i]);
    out += ",\"dominantR\":";
    writeDouble(out, dR[i]);
    out += ",\"dominantG\":";
    writeDouble(out, dG[i]);
    out += ",\"dominantB\":";
    writeDouble(out, dB[i]);
    out += "}";
  }
  out += "]\n";
  std::fwrite(out.data(), 1, out.size(), stdout);
  return 0;
}

// Batch sibling of decode-dng-rois. Accepts nested `[[roi,...], ...]`
// and emits the corresponding nested output. Runs parseDng ONCE for
// the whole batch — measured ~7-8× speedup vs one CLI invocation per
// candidate (parseDng ~20ms per invocation vs ~0.5ms per ROI decode
// on a 12MP Pixel-7 DNG). Analyzer sweep uses this to collapse its
// 30-candidate × 4-ROI probe into a single subprocess call per
// fixture.
int cmdDecodeDngRoisBatch(int argc, char** argv) {
  if (argc < 4) {
    die("usage: dng-cli-cpp decode-dng-rois-batch <dngPath> <nestedRoisJson>");
  }
  const std::string path = readFilePath(argv[2]);
  const std::string roisJson = argv[3];
  const std::vector<std::vector<Roi>> sets = parseNestedRoisJson(roisJson);

  // Flatten every set into one big ROI array for a single call into
  // the C bridge — which then loops without re-parsing the DNG. The
  // output arrays come back in the same order; we walk them back
  // out into per-set nested JSON below.
  size_t total = 0;
  for (const auto& s : sets) total += s.size();
  std::vector<int32_t> flat(total * 4);
  size_t w = 0;
  for (const auto& s : sets) {
    for (const auto& r : s) {
      flat[w++] = r.x;
      flat[w++] = r.y;
      flat[w++] = r.w;
      flat[w++] = r.h;
    }
  }

  std::vector<double> mR(total), mG(total), mB(total);
  std::vector<double> dR(total), dG(total), dB(total);
  const char* err = nullptr;
  if (total > 0) {
    if (!dngDecoderDecodeRoisReduced(path.c_str(), flat.data(),
                                     static_cast<int32_t>(total), mR.data(),
                                     mG.data(), mB.data(), dR.data(),
                                     dG.data(), dB.data(), &err)) {
      die(std::string("dngDecoderDecodeRoisReduced failed: ") +
          (err ? err : "unknown"));
    }
  }

  std::string out = "[";
  size_t off = 0;
  for (size_t si = 0; si < sets.size(); ++si) {
    if (si) out += ",";
    out += "[";
    for (size_t i = 0; i < sets[si].size(); ++i) {
      if (i) out += ",";
      const size_t k = off + i;
      out += "{\"r\":";
      writeDouble(out, mR[k]);
      out += ",\"g\":";
      writeDouble(out, mG[k]);
      out += ",\"b\":";
      writeDouble(out, mB[k]);
      out += ",\"dominantR\":";
      writeDouble(out, dR[k]);
      out += ",\"dominantG\":";
      writeDouble(out, dG[k]);
      out += ",\"dominantB\":";
      writeDouble(out, dB[k]);
      out += "}";
    }
    out += "]";
    off += sets[si].size();
  }
  out += "]\n";
  std::fwrite(out.data(), 1, out.size(), stdout);
  return 0;
}

int cmdReadMetadata(int argc, char** argv) {
  if (argc < 3) die("usage: dng-cli-cpp read-metadata <dngPath>");
  const std::string path = readFilePath(argv[2]);
  DngMetadataC meta{};
  if (!dngDecoderReadMetadata(path.c_str(), &meta)) {
    die(std::string("dngDecoderReadMetadata failed: ") +
        (meta.errorMessage ? meta.errorMessage : "unknown"));
  }
  auto ch = [](int32_t c) -> char {
    switch (c) { case 0: return 'R'; case 1: return 'G'; case 2: return 'B'; }
    return '?';
  };
  std::string out = "{";
  out += "\"width\":" + std::to_string(meta.width) + ",";
  out += "\"height\":" + std::to_string(meta.height) + ",";
  out += "\"bitsPerSample\":" + std::to_string(meta.bitsPerSample) + ",";
  out += std::string("\"cfaPattern\":\"") +
         ch(meta.cfa0) + ch(meta.cfa1) + ch(meta.cfa2) + ch(meta.cfa3) + "\",";
  out += "\"blackLevel\":";
  writeDouble(out, meta.blackLevel);
  out += ",\"whiteLevel\":";
  writeDouble(out, meta.whiteLevel);
  out += ",\"isMonochrome\":";
  out += (meta.isMonochrome ? "true" : "false");
  out += "}\n";
  std::fwrite(out.data(), 1, out.size(), stdout);
  return 0;
}

int cmdReadPreviewRgb(int argc, char** argv) {
  if (argc < 5)
    die("usage: dng-cli-cpp read-preview-rgb <dngPath> <maxDim> <outRgbPath>");
  const std::string path = readFilePath(argv[2]);
  const int32_t maxDim = std::atoi(argv[3]);
  const std::string outPath = readFilePath(argv[4]);

  // Source dims via metadata (before renderPreview downscales).
  DngMetadataC meta{};
  if (!dngDecoderReadMetadata(path.c_str(), &meta)) {
    die(std::string("dngDecoderReadMetadata failed: ") +
        (meta.errorMessage ? meta.errorMessage : "unknown"));
  }

  int32_t w = 0, h = 0, byteCount = 0;
  uint32_t* rgba = nullptr;
  const char* err = nullptr;
  if (!dngDecoderRenderPreviewRgba(path.c_str(), maxDim, &w, &h, &rgba,
                                   &byteCount, &err)) {
    die(std::string("dngDecoderRenderPreviewRgba failed: ") +
        (err ? err : "unknown"));
  }

  // Report source dims in the SAME orientation as the preview we just
  // rendered. metadata.width/height come from the raw sensor (usually
  // landscape); renderPreview applies the DNG's Orientation tag so its
  // output is display-oriented (portrait for phone captures). Callers
  // scale ROIs by (source / preview) and expect uniform scaling on
  // both axes — feeding sensor-landscape source with portrait preview
  // gives non-uniform scaling and ROIs land out of bounds.
  // Detection: preview and sensor have opposite landscape-ness.
  // Mirrors HybridDngDecoder.kt readPreviewRgb's swap logic.
  const bool previewIsPortrait = h > w;
  const bool sensorIsPortrait = meta.height > meta.width;
  const bool swap = previewIsPortrait != sensorIsPortrait;
  const int32_t sourceWidth = swap ? meta.height : meta.width;
  const int32_t sourceHeight = swap ? meta.width : meta.height;

  // Convert ARGB8888 (0xFFRRGGBB) → interleaved RGB bytes to match
  // the Swift CLI's read-preview-rgb layout.
  const size_t nPix = static_cast<size_t>(w) * static_cast<size_t>(h);
  std::vector<uint8_t> rgb(nPix * 3);
  for (size_t i = 0; i < nPix; i++) {
    const uint32_t px = rgba[i];
    rgb[i * 3 + 0] = static_cast<uint8_t>((px >> 16) & 0xFF); // R
    rgb[i * 3 + 1] = static_cast<uint8_t>((px >> 8) & 0xFF);  // G
    rgb[i * 3 + 2] = static_cast<uint8_t>(px & 0xFF);         // B
  }
  dngDecoderFreePreview(rgba);

  std::ofstream ofs(outPath, std::ios::binary);
  if (!ofs) die("failed to open output file: " + outPath);
  ofs.write(reinterpret_cast<const char*>(rgb.data()),
            static_cast<std::streamsize>(rgb.size()));
  ofs.close();
  if (!ofs) die("failed to write output file: " + outPath);

  std::string out = "{";
  out += "\"width\":" + std::to_string(w) + ",";
  out += "\"height\":" + std::to_string(h) + ",";
  out += "\"sourceWidth\":" + std::to_string(sourceWidth) + ",";
  out += "\"sourceHeight\":" + std::to_string(sourceHeight) + "}\n";
  std::fwrite(out.data(), 1, out.size(), stdout);
  return 0;
}

int usage() {
  std::fputs(
    "usage: dng-cli-cpp <subcommand> ...\n"
    "  decode-dng-rois        <dngPath> <roisJson>\n"
    "  decode-dng-rois-batch  <dngPath> <nestedRoisJson>\n"
    "  read-preview-rgb       <dngPath> <maxDim> <outRgbPath>\n"
    "  read-metadata          <dngPath>\n",
    stderr);
  return 1;
}

} // namespace

int main(int argc, char** argv) {
  if (argc < 2) return usage();
  const std::string cmd = argv[1];
  try {
    if (cmd == "decode-dng-rois") return cmdDecodeDngRois(argc, argv);
    if (cmd == "decode-dng-rois-batch") return cmdDecodeDngRoisBatch(argc, argv);
    if (cmd == "read-metadata") return cmdReadMetadata(argc, argv);
    if (cmd == "read-preview-rgb") return cmdReadPreviewRgb(argc, argv);
  } catch (const std::exception& e) {
    die(std::string("unexpected exception: ") + e.what());
  }
  return usage();
}
