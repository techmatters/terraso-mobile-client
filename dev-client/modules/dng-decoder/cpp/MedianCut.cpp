#include "MedianCut.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <queue>
#include <vector>

namespace dngdecoder {

namespace {

// 5 bits per channel → 32 bins per axis → 32^3 = 32768 total bins.
// Matches the quantize.js sigbits default and keeps the histogram
// compact enough to allocate on the stack via std::array.
constexpr int kBits = 5;
constexpr int kBinsPerAxis = 1 << kBits;                 // 32
constexpr int kBins = kBinsPerAxis * kBinsPerAxis * kBinsPerAxis;  // 32768
constexpr int kShift = 8 - kBits;                        // 3

// Bit-pack an (r5, g5, b5) triple into a 15-bit histogram index.
inline int histoIndex(int r5, int g5, int b5) {
  return (r5 << (kBits * 2)) | (g5 << kBits) | b5;
}

// sRGB piecewise gamma encode (linear 0..1 → sRGB 0..255). Uses double
// throughout — this is called once per input pixel.
inline int linearToSrgb255(double v) {
  if (v <= 0.0) return 0;
  if (v >= 1.0) return 255;
  const double enc = v <= 0.0031308
                         ? 12.92 * v
                         : 1.055 * std::pow(v, 1.0 / 2.4) - 0.055;
  return static_cast<int>(std::lround(enc * 255.0));
}

// sRGB byte → linear float. Piecewise inverse of the above; used exactly
// three times per call (once per centroid channel).
inline double srgb255ToLinear(int v) {
  const double s = v / 255.0;
  if (s <= 0.04045) return s / 12.92;
  return std::pow((s + 0.055) / 1.055, 2.4);
}

// A vbox is the smallest axis-aligned bounding cuboid over its assigned
// histogram bins in 5-bit space, plus cached population/volume/count
// stats so the median-cut splitter can pick "the biggest one" without
// re-walking the histogram every iteration.
struct VBox {
  int r1, r2, g1, g2, b1, b2;  // inclusive bounds in 5-bit index space
  uint64_t count;              // pixels in the vbox
  int volume;                  // (r2-r1+1) * (g2-g1+1) * (b2-b1+1)

  // Ordering key for the priority queue: pixel count. Ties broken by
  // volume so we prefer to split a large flat vbox over a small
  // concentrated one — same intent as the quantize.js implementation.
  bool operator<(const VBox& other) const {
    if (count != other.count) return count < other.count;
    return volume < other.volume;
  }
};

// Compute the count-weighted average colour of every populated bin
// inside `box`, then convert back to gamma sRGB byte space (round to
// bin centre = shift + 4). Returns three 8-bit sRGB channel values.
std::array<int, 3> vboxCentroid(
    const std::array<uint64_t, kBins>& histo, const VBox& box) {
  uint64_t sumR = 0, sumG = 0, sumB = 0, sumN = 0;
  for (int r = box.r1; r <= box.r2; ++r) {
    for (int g = box.g1; g <= box.g2; ++g) {
      for (int b = box.b1; b <= box.b2; ++b) {
        const uint64_t n = histo[histoIndex(r, g, b)];
        if (n == 0) continue;
        // Each 5-bit bin covers 8 sRGB byte values; +4 centres us on
        // the middle of the bin's byte range (bin 3 → bytes 24..31 →
        // centre 27.5 ≈ 28).
        sumR += n * ((r << kShift) + (1 << (kShift - 1)));
        sumG += n * ((g << kShift) + (1 << (kShift - 1)));
        sumB += n * ((b << kShift) + (1 << (kShift - 1)));
        sumN += n;
      }
    }
  }
  if (sumN == 0) return {0, 0, 0};
  return {
      static_cast<int>(sumR / sumN),
      static_cast<int>(sumG / sumN),
      static_cast<int>(sumB / sumN),
  };
}

// Tighten `box` to the axis-aligned bounding cuboid over its populated
// bins, and recompute count+volume. Called after every split so the
// two halves' bounds shrink to their actual pixel distribution
// (identical to quantize.js's box-tightening step).
void tightenVBox(const std::array<uint64_t, kBins>& histo, VBox& box) {
  int rMin = kBinsPerAxis, rMax = -1;
  int gMin = kBinsPerAxis, gMax = -1;
  int bMin = kBinsPerAxis, bMax = -1;
  uint64_t count = 0;
  for (int r = box.r1; r <= box.r2; ++r) {
    for (int g = box.g1; g <= box.g2; ++g) {
      for (int b = box.b1; b <= box.b2; ++b) {
        const uint64_t n = histo[histoIndex(r, g, b)];
        if (n == 0) continue;
        if (r < rMin) rMin = r;
        if (r > rMax) rMax = r;
        if (g < gMin) gMin = g;
        if (g > gMax) gMax = g;
        if (b < bMin) bMin = b;
        if (b > bMax) bMax = b;
        count += n;
      }
    }
  }
  if (count == 0) {
    box.count = 0;
    box.volume = 0;
    return;
  }
  box.r1 = rMin;
  box.r2 = rMax;
  box.g1 = gMin;
  box.g2 = gMax;
  box.b1 = bMin;
  box.b2 = bMax;
  box.count = count;
  box.volume =
      (rMax - rMin + 1) * (gMax - gMin + 1) * (bMax - bMin + 1);
}

// Split `box` along its longest axis at the median cumulative pixel
// count. Returns two child vboxes; the caller pushes both. When the
// box is uniform on all axes (single-plane) or the median lands at an
// extreme, one child may be empty — the caller drops zero-count boxes.
std::pair<VBox, VBox> splitVBox(
    const std::array<uint64_t, kBins>& histo, const VBox& box) {
  // Longest axis wins.
  const int rr = box.r2 - box.r1;
  const int gr = box.g2 - box.g1;
  const int br = box.b2 - box.b1;
  enum Axis { R, G, B } axis = R;
  if (gr >= rr && gr >= br) axis = G;
  else if (br > rr && br > gr) axis = B;

  // Accumulate axis-projected counts. counts[i] = pixel count of the
  // slice at position i along the chosen axis.
  std::array<uint64_t, kBinsPerAxis> counts{};
  uint64_t total = 0;
  auto accumulate = [&](int i) {
    uint64_t n = 0;
    for (int r = box.r1; r <= box.r2; ++r) {
      for (int g = box.g1; g <= box.g2; ++g) {
        for (int b = box.b1; b <= box.b2; ++b) {
          if ((axis == R && r != i) ||
              (axis == G && g != i) ||
              (axis == B && b != i))
            continue;
          n += histo[histoIndex(r, g, b)];
        }
      }
    }
    return n;
  };
  const int lo = axis == R ? box.r1 : axis == G ? box.g1 : box.b1;
  const int hi = axis == R ? box.r2 : axis == G ? box.g2 : box.b2;
  for (int i = lo; i <= hi; ++i) {
    counts[i] = accumulate(i);
    total += counts[i];
  }

  // Find the split position: smallest i such that cumulative count
  // ≥ half of total. Then split BETWEEN i and i+1 (inclusive-inclusive
  // convention — the left half ends at i, the right half starts at i+1).
  uint64_t cum = 0;
  int split = lo;
  const uint64_t half = total / 2;
  for (int i = lo; i <= hi; ++i) {
    cum += counts[i];
    if (cum >= half) {
      split = i;
      break;
    }
  }
  // Prefer the smaller half — heuristic from quantize.js. If cutting
  // at `split` leaves one side much larger than the other, nudge left.
  if (split == hi && split > lo) split--;

  VBox left = box;
  VBox right = box;
  if (axis == R) { left.r2 = split; right.r1 = split + 1; }
  else if (axis == G) { left.g2 = split; right.g1 = split + 1; }
  else { left.b2 = split; right.b1 = split + 1; }
  tightenVBox(histo, left);
  tightenVBox(histo, right);
  return {left, right};
}

}  // namespace

LinearRgbF dominantLinearRgb(const std::vector<LinearRgbF>& pixels) {
  if (pixels.empty()) return {0.0, 0.0, 0.0};
  if (pixels.size() == 1) return pixels[0];

  // 1. Gamma-encode each pixel to sRGB bytes, bin into 5-bit
  //    histogram. Track the initial bounding cuboid on the way in.
  //    Heap allocation because 32768 * 8 bytes = 256KB — too large
  //    for the stack.
  auto histo = std::make_unique<std::array<uint64_t, kBins>>();
  histo->fill(0);
  int rMin = kBinsPerAxis, rMax = -1;
  int gMin = kBinsPerAxis, gMax = -1;
  int bMin = kBinsPerAxis, bMax = -1;
  for (const auto& p : pixels) {
    const int r5 = linearToSrgb255(p.r) >> kShift;
    const int g5 = linearToSrgb255(p.g) >> kShift;
    const int b5 = linearToSrgb255(p.b) >> kShift;
    (*histo)[histoIndex(r5, g5, b5)]++;
    if (r5 < rMin) rMin = r5;
    if (r5 > rMax) rMax = r5;
    if (g5 < gMin) gMin = g5;
    if (g5 > gMax) gMax = g5;
    if (b5 < bMin) bMin = b5;
    if (b5 > bMax) bMax = b5;
  }

  // 2. Seed the priority queue with a single vbox covering the whole
  //    populated range.
  VBox seed{rMin, rMax, gMin, gMax, bMin, bMax, 0, 0};
  tightenVBox(*histo, seed);
  if (seed.count == 0) return {0.0, 0.0, 0.0};

  std::priority_queue<VBox> queue;
  queue.push(seed);

  // 3. Iteratively split the largest vbox until we have N or run out
  //    of splittable candidates. Bound the loop count so a
  //    pathological input can't spin.
  int loops = 0;
  while (static_cast<int>(queue.size()) < kMedianCutTargetVBoxes &&
         loops++ < 1000) {
    if (queue.empty()) break;
    const VBox top = queue.top();
    // Unsplittable: single-bin-wide on all axes. Nothing more to do
    // with this or any smaller vbox.
    if (top.r1 == top.r2 && top.g1 == top.g2 && top.b1 == top.b2) break;
    queue.pop();
    auto [left, right] = splitVBox(*histo, top);
    if (left.count > 0) queue.push(left);
    if (right.count > 0) queue.push(right);
  }

  // 4. Drain the queue, sort by count descending, centroid the winner.
  std::vector<VBox> boxes;
  boxes.reserve(queue.size());
  while (!queue.empty()) {
    boxes.push_back(queue.top());
    queue.pop();
  }
  std::sort(boxes.begin(), boxes.end(),
            [](const VBox& a, const VBox& b) { return a.count > b.count; });
  const auto centroid = vboxCentroid(*histo, boxes[0]);
  return {
      srgb255ToLinear(centroid[0]),
      srgb255ToLinear(centroid[1]),
      srgb255ToLinear(centroid[2]),
  };
}

}  // namespace dngdecoder
