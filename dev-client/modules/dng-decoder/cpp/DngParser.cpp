#include "DngParser.hpp"

#include <algorithm>
#include <cstdio>
#include <cstring>
#include <memory>
#include <stdexcept>

namespace dngdecoder {

namespace {

// TIFF field types we care about.
constexpr uint16_t TT_BYTE = 1;
constexpr uint16_t TT_ASCII = 2;
constexpr uint16_t TT_SHORT = 3;
constexpr uint16_t TT_LONG = 4;
constexpr uint16_t TT_RATIONAL = 5;
constexpr uint16_t TT_SBYTE = 6;
constexpr uint16_t TT_SSHORT = 8;
constexpr uint16_t TT_SLONG = 9;
constexpr uint16_t TT_SRATIONAL = 10;

// TIFF / DNG tags we consume.
constexpr uint16_t TAG_IMAGE_WIDTH = 256;
constexpr uint16_t TAG_IMAGE_LENGTH = 257;
constexpr uint16_t TAG_BITS_PER_SAMPLE = 258;
constexpr uint16_t TAG_COMPRESSION = 259;
constexpr uint16_t TAG_PHOTOMETRIC = 262;
constexpr uint16_t TAG_ORIENTATION = 274;
constexpr uint16_t TAG_STRIP_OFFSETS = 273;
constexpr uint16_t TAG_ROWS_PER_STRIP = 278;
constexpr uint16_t TAG_STRIP_BYTE_COUNTS = 279;
constexpr uint16_t TAG_SUB_IFDS = 330;
constexpr uint16_t TAG_CFA_PATTERN_2 = 33422;     // CFAPattern (Exif)
constexpr uint16_t TAG_BLACK_LEVEL = 50714;
constexpr uint16_t TAG_WHITE_LEVEL = 50717;
constexpr uint16_t TAG_COLOR_MATRIX_1 = 50721;
constexpr uint16_t TAG_COLOR_MATRIX_2 = 50722;
constexpr uint16_t TAG_AS_SHOT_NEUTRAL = 50728;
constexpr uint16_t TAG_FORWARD_MATRIX_1 = 50964;
constexpr uint16_t TAG_FORWARD_MATRIX_2 = 50965;
constexpr uint16_t TAG_CFA_PATTERN_DNG = 50711;
// DNG DefaultCropOrigin (50719) + DefaultCropSize (50720): the rect on
// the raw image describing the "intended visible area". Written by
// DngCreator when the HAL provides a crop-related capture result.
// ActiveArea (50829) is a fallback: (top, left, bottom, right) of the
// area that contains actual image data (as opposed to optical-black
// borders). All are on the raw sub-IFD.
constexpr uint16_t TAG_DEFAULT_CROP_ORIGIN = 50719;
constexpr uint16_t TAG_DEFAULT_CROP_SIZE = 50720;
constexpr uint16_t TAG_ACTIVE_AREA = 50829;

constexpr uint16_t PHOTOMETRIC_CFA = 32803;
constexpr uint16_t PHOTOMETRIC_LINEAR_RAW = 34892;

// Reads primitives with configurable endianness.
struct Reader {
  const uint8_t* data;
  size_t size;
  bool littleEndian;

  uint16_t u16(size_t off) const {
    check(off, 2);
    if (littleEndian) return uint16_t(data[off]) | (uint16_t(data[off + 1]) << 8);
    return (uint16_t(data[off]) << 8) | uint16_t(data[off + 1]);
  }

  uint32_t u32(size_t off) const {
    check(off, 4);
    if (littleEndian) {
      return uint32_t(data[off]) | (uint32_t(data[off + 1]) << 8) |
             (uint32_t(data[off + 2]) << 16) | (uint32_t(data[off + 3]) << 24);
    }
    return (uint32_t(data[off]) << 24) | (uint32_t(data[off + 1]) << 16) |
           (uint32_t(data[off + 2]) << 8) | uint32_t(data[off + 3]);
  }

  int32_t s32(size_t off) const { return static_cast<int32_t>(u32(off)); }

  uint8_t u8(size_t off) const {
    check(off, 1);
    return data[off];
  }

  void check(size_t off, size_t len) const {
    if (off > size || len > size - off) {
      throw std::runtime_error("DNG parser: read past end of file");
    }
  }
};

struct IfdEntry {
  uint16_t tag;
  uint16_t type;
  uint32_t count;
  uint32_t valueOffset;  // Raw 4-byte payload; may be inline or an offset.
};

// Byte length of one value of the given field type.
size_t typeSize(uint16_t type) {
  switch (type) {
    case TT_BYTE:
    case TT_ASCII:
    case TT_SBYTE:
      return 1;
    case TT_SHORT:
    case TT_SSHORT:
      return 2;
    case TT_LONG:
    case TT_SLONG:
      return 4;
    case TT_RATIONAL:
    case TT_SRATIONAL:
      return 8;
    default:
      return 0;
  }
}

struct Ifd {
  std::vector<IfdEntry> entries;
  std::vector<size_t> entryFileOffsets;

  const IfdEntry* find(uint16_t tag, size_t* outEntryOffset = nullptr) const {
    for (size_t i = 0; i < entries.size(); ++i) {
      if (entries[i].tag == tag) {
        if (outEntryOffset) *outEntryOffset = entryFileOffsets[i];
        return &entries[i];
      }
    }
    return nullptr;
  }
};

Ifd readIfd(const Reader& r, size_t offset) {
  Ifd ifd;
  const uint16_t n = r.u16(offset);
  ifd.entries.reserve(n);
  ifd.entryFileOffsets.reserve(n);
  size_t p = offset + 2;
  for (uint16_t i = 0; i < n; ++i) {
    IfdEntry e;
    e.tag = r.u16(p);
    e.type = r.u16(p + 2);
    e.count = r.u32(p + 4);
    e.valueOffset = r.u32(p + 8);
    ifd.entries.push_back(e);
    ifd.entryFileOffsets.push_back(p);
    p += 12;
  }
  return ifd;
}

// Helper: given an IFD entry + parallel offset info, read n scalars into out.
void readScalars(const Reader& r, const IfdEntry& e, size_t entryOffset,
                 std::vector<double>& out) {
  const size_t sz = typeSize(e.type);
  const size_t total = e.count * sz;
  const size_t base = (total <= 4) ? entryOffset + 8 : e.valueOffset;
  out.resize(e.count);
  for (uint32_t i = 0; i < e.count; ++i) {
    switch (e.type) {
      case TT_BYTE:
        out[i] = r.u8(base + i);
        break;
      case TT_SBYTE:
        out[i] = static_cast<int8_t>(r.u8(base + i));
        break;
      case TT_SHORT:
        out[i] = r.u16(base + i * 2);
        break;
      case TT_SSHORT:
        out[i] = static_cast<int16_t>(r.u16(base + i * 2));
        break;
      case TT_LONG:
        out[i] = r.u32(base + i * 4);
        break;
      case TT_SLONG:
        out[i] = r.s32(base + i * 4);
        break;
      case TT_RATIONAL: {
        uint32_t num = r.u32(base + i * 8);
        uint32_t den = r.u32(base + i * 8 + 4);
        out[i] = den ? double(num) / double(den) : 0.0;
      } break;
      case TT_SRATIONAL: {
        int32_t num = r.s32(base + i * 8);
        int32_t den = r.s32(base + i * 8 + 4);
        out[i] = den ? double(num) / double(den) : 0.0;
      } break;
      default:
        throw std::runtime_error("DNG parser: unsupported field type in array");
    }
  }
}

// Decode raw strip bytes to widened uint16 pixels, handling 10/12/14/16-bit
// MSB-packed samples. Vision-camera on iOS writes 14-bit MSB-packed; Android
// varies. See TIFF/EP §6 and DNG spec §5.
void unpackStrip(const uint8_t* src, size_t srcBytes, uint16_t bits,
                 uint16_t* dst, size_t pixelCount) {
  if (bits == 16) {
    // Sanity: strip should be exactly 2*pixelCount bytes.
    if (srcBytes < pixelCount * 2) {
      throw std::runtime_error("DNG parser: 16-bit strip too short");
    }
    for (size_t i = 0; i < pixelCount; ++i) {
      // DNG raw samples are big-endian regardless of TIFF header byte order.
      // But in practice most writers use the TIFF byte order for raw too.
      // Vision-camera writes little-endian raw on little-endian devices —
      // assume the file byte order matches the samples.
      dst[i] = static_cast<uint16_t>(src[i * 2]) |
               (static_cast<uint16_t>(src[i * 2 + 1]) << 8);
    }
    return;
  }
  // 10/12/14-bit: MSB-packed bitstream.
  uint32_t bitBuffer = 0;
  int bitsInBuffer = 0;
  size_t srcIdx = 0;
  const uint32_t mask = (1u << bits) - 1u;
  for (size_t i = 0; i < pixelCount; ++i) {
    while (bitsInBuffer < bits) {
      if (srcIdx >= srcBytes) {
        throw std::runtime_error("DNG parser: bit-packed strip exhausted");
      }
      bitBuffer = (bitBuffer << 8) | src[srcIdx++];
      bitsInBuffer += 8;
    }
    bitsInBuffer -= bits;
    dst[i] = static_cast<uint16_t>((bitBuffer >> bitsInBuffer) & mask);
  }
}

// The raw sub-IFD in a DNG is the one with PhotometricInterpretation == CFA
// (32803) or, failing that, NewSubfileType == 0 among the SubIFDs. We look
// through the sub-IFDs pointed to by tag 330 on the root IFD.
// Read a single scalar from an entry into a double.
double readFirstScalar(const Reader& r, const IfdEntry& e, size_t entryOffset) {
  std::vector<double> v;
  readScalars(r, e, entryOffset, v);
  if (v.empty()) throw std::runtime_error("DNG parser: empty scalar field");
  return v[0];
}

struct RawIfdResult {
  Ifd ifd;
  uint16_t photometric;
};

// Find the IFD containing the raw pixel data. Prefer a CFA sub-IFD when
// present (a ProRAW file *might* embed a plain-Bayer sub-IFD alongside its
// main LinearRaw IFD; if so, we prefer the CFA one for higher fidelity).
// Otherwise fall back to any LinearRaw IFD. Throws if neither is found.
RawIfdResult findRawIfd(const Reader& r, const Ifd& root) {
  auto photoOf = [&](const Ifd& ifd) -> uint16_t {
    size_t off = 0;
    if (auto* p = ifd.find(TAG_PHOTOMETRIC, &off)) {
      return static_cast<uint16_t>(readFirstScalar(r, *p, off));
    }
    return 0;
  };

  // Collect all candidate IFDs: root + all sub-IFDs.
  std::vector<Ifd> candidates;
  size_t subIfdsOffset = 0;
  if (const IfdEntry* subIfds = root.find(TAG_SUB_IFDS, &subIfdsOffset)) {
    std::vector<double> offsets;
    readScalars(r, *subIfds, subIfdsOffset, offsets);
    for (double off : offsets) {
      candidates.push_back(readIfd(r, static_cast<size_t>(off)));
    }
  }
  candidates.push_back(root);

  // First pass: any CFA IFD wins.
  for (const auto& ifd : candidates) {
    if (photoOf(ifd) == PHOTOMETRIC_CFA) return {ifd, PHOTOMETRIC_CFA};
  }
  // Second pass: fall back to LinearRaw.
  for (const auto& ifd : candidates) {
    if (photoOf(ifd) == PHOTOMETRIC_LINEAR_RAW) {
      return {ifd, PHOTOMETRIC_LINEAR_RAW};
    }
  }
  throw std::runtime_error(
      "DNG parser: no CFA (32803) or LinearRaw (34892) IFD found");
}

}  // namespace

ParsedDng parseDng(const std::string& path) {
  // Callers hand us a URI or plain filesystem path indiscriminately —
  // iOS Swift strips file:// itself, but Kotlin (and any new caller)
  // doesn't. Handle both here so no bridge layer has to remember.
  static constexpr const char kFileScheme[] = "file://";
  const std::string fsPath =
      (path.rfind(kFileScheme, 0) == 0)
          ? path.substr(sizeof(kFileScheme) - 1)
          : path;

  // Load the whole file. Vision-camera DNGs are 10–30 MB — manageable, and
  // parsing needs random access. Memory-mapping would be a nice-to-have.
  std::unique_ptr<FILE, decltype(&fclose)> f(fopen(fsPath.c_str(), "rb"), &fclose);
  if (!f) throw std::runtime_error("DNG parser: cannot open " + fsPath);

  fseek(f.get(), 0, SEEK_END);
  const long fsz = ftell(f.get());
  if (fsz < 8) throw std::runtime_error("DNG parser: file too small");
  fseek(f.get(), 0, SEEK_SET);
  std::vector<uint8_t> buf(static_cast<size_t>(fsz));
  if (fread(buf.data(), 1, buf.size(), f.get()) != buf.size()) {
    throw std::runtime_error("DNG parser: read failed");
  }

  Reader r{buf.data(), buf.size(), true};
  // Header byte order.
  if (buf[0] == 'I' && buf[1] == 'I') {
    r.littleEndian = true;
  } else if (buf[0] == 'M' && buf[1] == 'M') {
    r.littleEndian = false;
  } else {
    throw std::runtime_error("DNG parser: bad byte-order marker");
  }
  if (r.u16(2) != 42) throw std::runtime_error("DNG parser: bad TIFF magic");

  const uint32_t firstIfdOffset = r.u32(4);
  Ifd root = readIfd(r, firstIfdOffset);
  const RawIfdResult rawResult = findRawIfd(r, root);
  const Ifd& raw = rawResult.ifd;

  ParsedDng out;
  out.layout = (rawResult.photometric == PHOTOMETRIC_LINEAR_RAW)
                   ? PixelLayout::LinearRaw
                   : PixelLayout::Cfa;
  const uint32_t samplesPerPixel = (out.layout == PixelLayout::LinearRaw) ? 3u : 1u;

  auto readOneScalar = [&](uint16_t tag, double fallback) -> double {
    size_t off = 0;
    if (auto* e = raw.find(tag, &off)) {
      std::vector<double> v;
      readScalars(r, *e, off, v);
      return v.empty() ? fallback : v[0];
    }
    if (auto* e = root.find(tag, &off)) {
      std::vector<double> v;
      readScalars(r, *e, off, v);
      return v.empty() ? fallback : v[0];
    }
    return fallback;
  };

  out.width = static_cast<uint32_t>(readOneScalar(TAG_IMAGE_WIDTH, 0));
  out.height = static_cast<uint32_t>(readOneScalar(TAG_IMAGE_LENGTH, 0));
  out.bitsPerSample =
      static_cast<uint16_t>(readOneScalar(TAG_BITS_PER_SAMPLE, 16));
  // TIFF Orientation tag. On DNGs it typically lives in the root IFD
  // (IFD-0), which readOneScalar checks after the raw IFD. Default 1 =
  // as-stored / no rotation.
  out.orientation =
      static_cast<uint16_t>(readOneScalar(TAG_ORIENTATION, 1));
  if (out.width == 0 || out.height == 0) {
    throw std::runtime_error("DNG parser: missing image dimensions");
  }

  // Crop rect: default to full image, then override with
  // DefaultCropOrigin/Size or ActiveArea if either is present.
  // See ParsedDng::cropRect comment for rationale.
  out.cropRect = {0, 0, out.width, out.height};
  {
    auto readVec = [&](uint16_t tag) -> std::vector<double> {
      std::vector<double> v;
      size_t off = 0;
      if (auto* e = raw.find(tag, &off)) {
        readScalars(r, *e, off, v);
      } else if (auto* e2 = root.find(tag, &off)) {
        readScalars(r, *e2, off, v);
      }
      return v;
    };
    const auto origin = readVec(TAG_DEFAULT_CROP_ORIGIN);
    const auto size = readVec(TAG_DEFAULT_CROP_SIZE);
    auto clip = [](double v, uint32_t lo, uint32_t hi) -> uint32_t {
      if (v <= double(lo)) return lo;
      if (v >= double(hi)) return hi;
      return static_cast<uint32_t>(v);
    };
    if (origin.size() >= 2 && size.size() >= 2 &&
        size[0] > 0 && size[1] > 0) {
      const uint32_t x = clip(origin[0], 0, out.width - 1);
      const uint32_t y = clip(origin[1], 0, out.height - 1);
      const uint32_t w = clip(size[0], 1, out.width - x);
      const uint32_t h = clip(size[1], 1, out.height - y);
      out.cropRect = {x, y, w, h};
    } else {
      // ActiveArea: (top, left, bottom, right) per DNG spec.
      const auto aa = readVec(TAG_ACTIVE_AREA);
      if (aa.size() >= 4) {
        const uint32_t top = static_cast<uint32_t>(aa[0]);
        const uint32_t left = static_cast<uint32_t>(aa[1]);
        const uint32_t bottom = static_cast<uint32_t>(aa[2]);
        const uint32_t right = static_cast<uint32_t>(aa[3]);
        if (bottom > top && right > left && right <= out.width &&
            bottom <= out.height) {
          out.cropRect = {left, top, right - left, bottom - top};
        }
      }
    }
  }

  // Compression must be 1 (uncompressed). Compressed lossless JPEG (7) or
  // lossy JPEG (34892) would need a separate path — deferred.
  const uint16_t comp = static_cast<uint16_t>(readOneScalar(TAG_COMPRESSION, 1));
  if (comp != 1) {
    throw std::runtime_error("DNG parser: compressed strips unsupported (comp=" +
                             std::to_string(comp) + ")");
  }

  // CFA pattern. Only meaningful for the CFA layout; LinearRaw has no
  // Bayer mosaic (Apple's ISP already demosaiced) so we skip.
  if (out.layout == PixelLayout::Cfa) {
    size_t off = 0;
    if (auto* e = raw.find(TAG_CFA_PATTERN_2, &off)) {
      std::vector<double> v;
      readScalars(r, *e, off, v);
      if (v.size() >= 4) {
        out.cfa = {{{uint8_t(v[0]), uint8_t(v[1])},
                    {uint8_t(v[2]), uint8_t(v[3])}}};
      }
    } else if (auto* e2 = raw.find(TAG_CFA_PATTERN_DNG, &off)) {
      // DNG's own CFAPattern (50711): header dim + then values. We only
      // handle 2×2. Assume the tag is 4 bytes of BYTE, no dim prefix (that
      // matches most writers).
      std::vector<double> v;
      readScalars(r, *e2, off, v);
      if (v.size() >= 4) {
        out.cfa = {{{uint8_t(v[0]), uint8_t(v[1])},
                    {uint8_t(v[2]), uint8_t(v[3])}}};
      }
    }
  }

  // BlackLevel — scalar, per-channel triple, or 4-value CFA pattern.
  {
    size_t off = 0;
    if (auto* e = raw.find(TAG_BLACK_LEVEL, &off)) {
      std::vector<double> v;
      readScalars(r, *e, off, v);
      if (v.size() == 1) {
        out.blackLevel = {v[0], v[0], v[0]};
      } else if (v.size() == 3) {
        // Common for LinearRaw: direct RGB triple.
        out.blackLevel = {v[0], v[1], v[2]};
      } else if (v.size() >= 4 && out.layout == PixelLayout::Cfa) {
        // 4-value form on CFA: map by the 2×2 CFA pattern into R/G/B.
        std::array<double, 3> sums{0, 0, 0};
        std::array<int, 3> counts{0, 0, 0};
        for (int i = 0; i < 4; ++i) {
          const uint8_t c = out.cfa[i / 2][i % 2];
          if (c < 3) {
            sums[c] += v[i];
            counts[c]++;
          }
        }
        for (int c = 0; c < 3; ++c) {
          out.blackLevel[c] = counts[c] ? sums[c] / counts[c] : 0.0;
        }
      }
    }
  }

  out.whiteLevel =
      readOneScalar(TAG_WHITE_LEVEL, (1u << out.bitsPerSample) - 1u);

  {
    size_t off = 0;
    if (auto* e = raw.find(TAG_AS_SHOT_NEUTRAL, &off)) {
      std::vector<double> v;
      readScalars(r, *e, off, v);
      if (v.size() >= 3) out.asShotNeutral = {v[0], v[1], v[2]};
    } else if (auto* e2 = root.find(TAG_AS_SHOT_NEUTRAL, &off)) {
      std::vector<double> v;
      readScalars(r, *e2, off, v);
      if (v.size() >= 3) out.asShotNeutral = {v[0], v[1], v[2]};
    }
  }

  {
    size_t off = 0;
    if (auto* e = raw.find(TAG_COLOR_MATRIX_1, &off)) {
      std::vector<double> v;
      readScalars(r, *e, off, v);
      if (v.size() >= 9) {
        for (int i = 0; i < 9; ++i) out.colorMatrix1[i] = v[i];
      }
    } else if (auto* e2 = root.find(TAG_COLOR_MATRIX_1, &off)) {
      std::vector<double> v;
      readScalars(r, *e2, off, v);
      if (v.size() >= 9) {
        for (int i = 0; i < 9; ++i) out.colorMatrix1[i] = v[i];
      }
    }
  }

  // ColorMatrix2 (D65 / daylight calibration). Optional per DNG spec
  // but universally present on modern phone camera DNGs. Pipeline
  // prefers this over ColorMatrix1 for typical scenes.
  {
    size_t off = 0;
    const IfdEntry* e = raw.find(TAG_COLOR_MATRIX_2, &off);
    if (!e) e = root.find(TAG_COLOR_MATRIX_2, &off);
    if (e) {
      std::vector<double> v;
      readScalars(r, *e, off, v);
      if (v.size() >= 9) {
        for (int i = 0; i < 9; ++i) out.colorMatrix2[i] = v[i];
        out.hasColorMatrix2 = true;
      }
    }
  }

  // ForwardMatrix2 (sensor → XYZ_D50 for the D65 calibration illuminant).
  // Preferred over inverted ColorMatrix when present — see hpp.
  {
    size_t off = 0;
    const IfdEntry* e = raw.find(TAG_FORWARD_MATRIX_2, &off);
    if (!e) e = root.find(TAG_FORWARD_MATRIX_2, &off);
    if (e) {
      std::vector<double> v;
      readScalars(r, *e, off, v);
      if (v.size() >= 9) {
        for (int i = 0; i < 9; ++i) out.forwardMatrix2[i] = v[i];
        out.hasForwardMatrix2 = true;
      }
    }
  }

  // Load raw pixel data from strips.
  size_t sooff = 0, sboff = 0;
  const IfdEntry* stripOffsets = raw.find(TAG_STRIP_OFFSETS, &sooff);
  const IfdEntry* stripByteCounts = raw.find(TAG_STRIP_BYTE_COUNTS, &sboff);
  if (!stripOffsets || !stripByteCounts) {
    throw std::runtime_error("DNG parser: missing strip data (tiles unsupported)");
  }
  std::vector<double> so, sb;
  readScalars(r, *stripOffsets, sooff, so);
  readScalars(r, *stripByteCounts, sboff, sb);
  if (so.size() != sb.size()) {
    throw std::runtime_error("DNG parser: strip offset/count mismatch");
  }

  // Sample count: 1/pixel for CFA, 3/pixel (interleaved RGB) for LinearRaw.
  const size_t samplesPerRow = size_t(out.width) * samplesPerPixel;
  const size_t totalSamples = samplesPerRow * out.height;
  out.pixels.resize(totalSamples);

  const uint32_t rowsPerStrip =
      static_cast<uint32_t>(readOneScalar(TAG_ROWS_PER_STRIP, out.height));

  size_t sampleOff = 0;
  for (size_t i = 0; i < so.size(); ++i) {
    const size_t off = static_cast<size_t>(so[i]);
    const size_t bytes = static_cast<size_t>(sb[i]);
    if (off + bytes > buf.size()) {
      throw std::runtime_error("DNG parser: strip range past EOF");
    }
    const uint32_t rowsSoFar = static_cast<uint32_t>(sampleOff / samplesPerRow);
    const uint32_t rowsThisStrip =
        std::min<uint32_t>(rowsPerStrip, out.height - rowsSoFar);
    const size_t samplesThisStrip = size_t(rowsThisStrip) * samplesPerRow;
    if (sampleOff + samplesThisStrip > totalSamples) {
      throw std::runtime_error("DNG parser: strip overruns image");
    }
    unpackStrip(buf.data() + off, bytes, out.bitsPerSample,
                out.pixels.data() + sampleOff, samplesThisStrip);
    sampleOff += samplesThisStrip;
  }
  if (sampleOff != totalSamples) {
    throw std::runtime_error("DNG parser: strip samples shorter than image");
  }

  return out;
}

}  // namespace dngdecoder
