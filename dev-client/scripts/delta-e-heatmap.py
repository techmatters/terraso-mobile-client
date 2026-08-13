#!/usr/bin/env python3
"""
Per-chip ΔE heatmap: Value × Chroma, one panel per WB anchor.

Reveals *which colors each WB anchor does well / poorly on*. E.g.,
postit (a yellow reference) tends to crush high-chroma yellows in
its own hue neighbourhood, whereas greycard (neutral) spreads error
more evenly. Complements the aggregate-mean tables — a WB anchor
with a low overall mean might still be terrible on a specific
Value×Chroma corner.

Cell = mean ΔE across all chips at that (Value, Chroma) position
under the given WB anchor, coloured on a shared scale (green → red).
Only chips with ≥ N observations at that position are shown; sparse
cells are left blank to avoid noisy single-sample outliers.

Usage:
    python3 scripts/delta-e-heatmap.py \\
        --json <run.json> --out <delta-e-heatmap.html>

Stdlib-only.
"""

import argparse
import collections
import json
import os
import re
import statistics
import sys
from html import escape

ap = argparse.ArgumentParser()
ap.add_argument('--json', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--min-n', type=int, default=3,
                help='hide cells with < this many chip observations')
args = ap.parse_args()


def wb_anchor_of(cap: dict) -> str:
    wb = cap.get('wb_correction') or {}
    if wb.get('source') == 'auto':
        return 'self'
    ref = wb.get('reference') or ''
    return ref.split(':', 1)[1] if ref.startswith('ref_card:') else (
        ref or '(none)')


# Munsell notation → (value, chroma). Handles "10YR 5/2", "10Y-5GY 6/1",
# "N 5" (neutral, no chroma → chroma 0), "GLEY1 6/N", etc. Returns None
# if the notation doesn't parse (e.g. ref card slots).
VC_RE = re.compile(r'\b([\d.]+)\s*/\s*([\d.]+|N)\b')

def parse_vc(notation: str):
    m = VC_RE.search(notation)
    if not m:
        # Neutral N X form
        m2 = re.match(r'^\s*N\s*([\d.]+)', notation)
        if m2:
            return (float(m2.group(1)), 0.0)
        return None
    try:
        v = float(m.group(1))
        c = 0.0 if m.group(2) == 'N' else float(m.group(2))
        return (v, c)
    except ValueError:
        return None


with open(args.json) as f:
    doc = json.load(f)
captures = doc.get('captures') or []

# Data: (wb_anchor, value, chroma) -> list of ΔEs
bucket = collections.defaultdict(list)
values_seen = set()
chromas_seen = set()
for cap in captures:
    cells = cap.get('cells') or []
    if not cells:
        continue
    wb = wb_anchor_of(cap)
    for cell in cells:
        de = cell.get('delta_e')
        if de is None:
            continue
        vc = parse_vc(cell['expected_notation'])
        if not vc:
            continue
        v, c = vc
        bucket[(wb, v, c)].append(de)
        values_seen.add(v)
        chromas_seen.add(c)

values = sorted(values_seen, reverse=True)  # high value at top
chromas = sorted(chromas_seen)
anchors = sorted({k[0] for k in bucket})

# Global min/max for the colour scale (shared so panels are comparable).
all_means = []
for (wb, v, c), lst in bucket.items():
    if len(lst) >= args.min_n:
        all_means.append(statistics.fmean(lst))
if all_means:
    scale_min = min(all_means)
    scale_max = max(all_means)
else:
    scale_min = 0.0
    scale_max = 20.0

print(
    f'loaded {len(captures)} captures → '
    f'{sum(len(lst) for lst in bucket.values())} chip measurements → '
    f'{len(anchors)} WB anchors × {len(values)} values × {len(chromas)} chromas',
    file=sys.stderr,
)


def color_for(de: float) -> str:
    """Green (low ΔE) → yellow → red (high ΔE). Perceptually simple."""
    if not (scale_max > scale_min):
        return '#eee'
    t = (de - scale_min) / (scale_max - scale_min)
    t = max(0.0, min(1.0, t))
    # HSL: green (120°) → yellow (60°) → red (0°). Lightness stays 55.
    hue = 120 * (1 - t)
    return f'hsl({hue:.0f}, 65%, 55%)'


def render_heatmap(wb: str) -> str:
    header = '<tr><th class="corner">V \\ C</th>' + ''.join(
        f'<th>/{c:g}</th>' for c in chromas) + '</tr>'
    body_rows = []
    for v in values:
        cells = [f'<th>{v:g}/</th>']
        for c in chromas:
            lst = bucket.get((wb, v, c))
            if not lst or len(lst) < args.min_n:
                cells.append('<td class="empty"></td>')
                continue
            mean = statistics.fmean(lst)
            cells.append(
                f'<td class="cell" style="background:{color_for(mean)}" '
                f'title="ΔE {mean:.1f}, n={len(lst)}">'
                f'{mean:.1f}'
                f'</td>'
            )
        body_rows.append(f'<tr>{"".join(cells)}</tr>')
    return (
        f'<div class="panel"><h3>{escape(wb)}</h3>'
        f'<table class="heat">{header}{"".join(body_rows)}</table></div>'
    )


# Colour-scale legend
def render_legend() -> str:
    stops = []
    for i in range(0, 11):
        de = scale_min + (scale_max - scale_min) * i / 10
        stops.append(
            f'<div class="legend-cell" style="background:{color_for(de)}">'
            f'{de:.1f}</div>'
        )
    return (
        f'<div class="legend"><span>ΔE scale:</span>'
        + ''.join(stops)
        + '</div>'
    )


panels = ''.join(render_heatmap(wb) for wb in anchors)

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ΔE heatmap: Value × Chroma, per WB anchor</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; margin: 24px; color: #222; }}
  h1 {{ margin: 0 0 4px; font-size: 22px; }}
  h3 {{ margin: 0 0 6px; font-size: 14px; }}
  .meta {{ font-size: 12px; color: #666; margin: 4px 0 12px; }}
  .panels {{ display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }}
  .panel {{ min-width: 240px; }}
  table.heat {{ border-collapse: collapse; font-size: 12px; font-variant-numeric: tabular-nums; }}
  table.heat th, table.heat td {{
    border: 1px solid #ccc; padding: 2px 6px; text-align: center;
  }}
  table.heat th {{ background: #f5f5f5; font-weight: 600; color: #444; }}
  table.heat td.cell {{ min-width: 34px; color: #111; text-shadow: 0 0 2px rgba(255,255,255,.7); }}
  table.heat td.empty {{ background: #fafafa; }}
  table.heat th.corner {{ background: #eee; color: #888; }}
  .legend {{ display: flex; gap: 0; align-items: center; margin: 16px 0; font-size: 11px; }}
  .legend span {{ margin-right: 12px; font-weight: 600; }}
  .legend-cell {{
    padding: 3px 6px; min-width: 34px; text-align: center;
    border: 1px solid #ccc; color: #111;
    text-shadow: 0 0 2px rgba(255,255,255,.7); font-variant-numeric: tabular-nums;
  }}
</style>
</head>
<body>
<h1>ΔE heatmap — Value × Chroma × WB anchor</h1>
<p class="meta">
  Source: <code>{escape(os.path.abspath(args.json))}</code><br>
  {sum(len(lst) for lst in bucket.values())} chip measurements ·
  min cell n = {args.min_n} · shared colour scale
  {scale_min:.1f}–{scale_max:.1f} ΔE (green good → red bad).<br>
  Rows: Munsell Value (top = light 8/, bottom = dark 2/).
  Cols: Chroma (left = neutral /1, right = saturated /8).
</p>
{render_legend()}
<div class="panels">
{panels}
</div>
</body>
</html>
'''

os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
with open(args.out, 'w') as f:
    f.write(html)
print(f'wrote {args.out} ({len(html)/1024:.1f} KB)', file=sys.stderr)
