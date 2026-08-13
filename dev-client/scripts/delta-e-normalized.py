#!/usr/bin/env python3
"""
Per-capture-normalized ΔE analysis.

Every shutter press produces one fixture that gets analysed under 2-4
WB anchors (auto=self / whibal / postit / greycard). "Capture quality"
— framing, focus, illumination unevenness — is a huge nuisance
variable when comparing WB anchors across the whole dataset: a poorly-
lit capture inflates ΔE regardless of WB choice. To isolate the WB
effect, this report compares WB anchors *within each capture* rather
than across the whole run.

For every fixture with >= 2 WB anchor variants, computes:

  1. Mean ΔE per variant (across that capture's ~30 chips).
  2. Delta vs. this capture's BEST variant: how many ΔE units worse.
  3. Rank among that capture's variants (1 = best).

Then aggregates over all fixtures per WB anchor:

  - Win rate: fraction of fixtures where this anchor ranked #1
  - Mean penalty vs. best: average (variant_mean - best_mean) across
    the fixtures where this anchor appeared
  - Head-to-head: fraction of fixtures where anchor A beat anchor B

Removes capture-quality as a confound. Positive answers to "should we
prefer whibal or greycard?" even when captures are noisy.

Stdlib-only.
"""

import argparse
import collections
import json
import os
import statistics
import sys
from html import escape

ap = argparse.ArgumentParser()
ap.add_argument('--json', required=True)
ap.add_argument('--out', required=True)
args = ap.parse_args()


def wb_anchor_of(cap: dict) -> str:
    wb = cap.get('wb_correction') or {}
    if wb.get('source') == 'auto':
        return 'self'
    ref = wb.get('reference') or ''
    return ref.split(':', 1)[1] if ref.startswith('ref_card:') else (
        ref or '(none)')


def device_of(p: str) -> str:
    if 'iPhone' in p: return 'iPhone'
    if 'Pixel 4' in p: return 'Pixel 4'
    if 'Pixel 6a' in p: return 'Pixel 6a'
    if 'Pixel 7' in p: return 'Pixel 7'
    return 'other'


with open(args.json) as f:
    doc = json.load(f)
captures = doc.get('captures') or []

# Group captures by fixture stem (label + format — since raw and photo
# analyses of the same shutter are independent "captures" that share
# WB anchors but not pipelines).
# Structure: fixture_key -> [{'wb_anchor': ..., 'mean_de': ..., 'n': ...}, ...]
fixture_key = lambda cap: (cap['label'], cap['capture_format'])
by_fixture = collections.defaultdict(list)

for cap in captures:
    cells = cap.get('cells') or []
    if not cells:
        continue
    des = [c['delta_e'] for c in cells if c.get('delta_e') is not None]
    if not des:
        continue
    by_fixture[fixture_key(cap)].append({
        'device': device_of(cap['source_path']),
        'format': cap['capture_format'],
        'wb_anchor': wb_anchor_of(cap),
        'mean_de': statistics.fmean(des),
        'n': len(des),
    })

# Keep only fixtures where at least 2 WB anchors are present (need a
# comparison target). Skip fixtures where analyzer produced only one
# variant — no within-fixture ranking possible.
multi_fixtures = {k: v for k, v in by_fixture.items() if len(v) >= 2}
print(
    f'loaded {len(captures)} captures → '
    f'{len(by_fixture)} fixtures → '
    f'{len(multi_fixtures)} with ≥ 2 WB anchors',
    file=sys.stderr,
)

# ---- Per-anchor stats -------------------------------------------------------

anchor_stats = collections.defaultdict(lambda: {
    'appearances': 0,
    'wins': 0,
    'ties_for_win': 0,
    'penalty_sum': 0.0,
    'penalty_count': 0,
})
h2h = collections.defaultdict(lambda: {'a_wins': 0, 'b_wins': 0, 'ties': 0})

for variants in multi_fixtures.values():
    variants_sorted = sorted(variants, key=lambda v: v['mean_de'])
    best_de = variants_sorted[0]['mean_de']
    best_anchors = [v['wb_anchor'] for v in variants_sorted
                    if v['mean_de'] == best_de]
    for v in variants:
        s = anchor_stats[v['wb_anchor']]
        s['appearances'] += 1
        if v['mean_de'] == best_de:
            if len(best_anchors) == 1:
                s['wins'] += 1
            else:
                s['ties_for_win'] += 1
        s['penalty_sum'] += v['mean_de'] - best_de
        s['penalty_count'] += 1
    # Head-to-head: every pair within the same fixture
    for i in range(len(variants)):
        for j in range(len(variants)):
            if i == j:
                continue
            a, b = variants[i]['wb_anchor'], variants[j]['wb_anchor']
            if variants[i]['mean_de'] < variants[j]['mean_de']:
                h2h[(a, b)]['a_wins'] += 1
            elif variants[i]['mean_de'] > variants[j]['mean_de']:
                h2h[(a, b)]['b_wins'] += 1
            else:
                h2h[(a, b)]['ties'] += 1

# ---- Render -----------------------------------------------------------------

def render_anchor_table(anchor_stats: dict) -> str:
    rows = []
    for anchor, s in sorted(
        anchor_stats.items(),
        key=lambda kv: kv[1]['penalty_sum'] / max(1, kv[1]['penalty_count']),
    ):
        n = s['appearances']
        win_pct = 100 * s['wins'] / max(1, n)
        tie_pct = 100 * s['ties_for_win'] / max(1, n)
        mean_penalty = s['penalty_sum'] / max(1, s['penalty_count'])
        rows.append(
            f'<tr><td>{escape(anchor)}</td>'
            f'<td class="num">{n}</td>'
            f'<td class="num">{win_pct:.1f} %</td>'
            f'<td class="num">{tie_pct:.1f} %</td>'
            f'<td class="num">{mean_penalty:.2f}</td>'
            f'</tr>'
        )
    return (
        '<section><h2>WB anchor summary (within-fixture)</h2>'
        '<p class="note">Fixtures with ≥ 2 WB anchors, ranked by mean penalty '
        'vs. that fixture\'s best anchor. Lower = better.</p>'
        '<table><thead><tr>'
        '<th>WB anchor</th><th>appearances</th><th>win rate</th>'
        '<th>tied-for-win</th><th>mean ΔE penalty vs. best</th>'
        '</tr></thead><tbody>'
        + ''.join(rows)
        + '</tbody></table></section>'
    )


def render_h2h_matrix(h2h: dict) -> str:
    anchors = sorted({a for (a, b) in h2h} | {b for (a, b) in h2h})
    # cells[row][col] = fraction of matchups where ROW anchor beats COL anchor
    rows_html = []
    header = '<tr><th></th>' + ''.join(
        f'<th>vs {escape(a)}</th>' for a in anchors) + '</tr>'
    for a in anchors:
        cells = []
        for b in anchors:
            if a == b:
                cells.append('<td class="diag">—</td>')
                continue
            m = h2h.get((a, b))
            if not m:
                cells.append('<td class="num">·</td>')
                continue
            total = m['a_wins'] + m['b_wins'] + m['ties']
            frac = 100 * m['a_wins'] / max(1, total)
            # colour: green when a wins >50%, red when <50%
            hue = 120 if frac >= 50 else 0
            lightness = 100 - (abs(frac - 50) * 0.6)
            cells.append(
                f'<td class="num h2h" '
                f'style="background:hsl({hue},70%,{lightness:.0f}%)">'
                f'{frac:.0f} %<br><small>({m["a_wins"]}/{total})</small></td>'
            )
        rows_html.append(
            f'<tr><th>{escape(a)}</th>{"".join(cells)}</tr>')
    return (
        '<section><h2>Head-to-head win rates</h2>'
        '<p class="note">Cell = fraction of fixtures where the ROW anchor '
        'beat the COLUMN anchor. Green &gt; 50 %, red &lt; 50 %. '
        'Bracketed count is (wins / matchups).</p>'
        f'<table>{header}{"".join(rows_html)}</table></section>'
    )


# Also break out head-to-head by (device, format) — reveals if e.g.
# whibal wins on iPhone raw but not on Pixel raw.
def render_h2h_by_slice(multi_fixtures: dict) -> str:
    # For each (device, format), rebuild h2h from scratch on that subset.
    slices = collections.defaultdict(dict)  # (device,format) -> h2h_dict
    for variants in multi_fixtures.values():
        # All variants share device + format (raw and photo are diff fixtures)
        dev = variants[0]['device']
        fmt = variants[0]['format']
        slice_h2h = slices[(dev, fmt)]
        for i in range(len(variants)):
            for j in range(len(variants)):
                if i == j:
                    continue
                a, b = variants[i]['wb_anchor'], variants[j]['wb_anchor']
                if (a, b) not in slice_h2h:
                    slice_h2h[(a, b)] = {'a_wins': 0, 'b_wins': 0, 'ties': 0}
                if variants[i]['mean_de'] < variants[j]['mean_de']:
                    slice_h2h[(a, b)]['a_wins'] += 1
                elif variants[i]['mean_de'] > variants[j]['mean_de']:
                    slice_h2h[(a, b)]['b_wins'] += 1
                else:
                    slice_h2h[(a, b)]['ties'] += 1
    parts = ['<section><h2>Head-to-head by (device × format)</h2>']
    for (dev, fmt), sh in sorted(slices.items()):
        parts.append(f'<h3>{escape(dev)} · {escape(fmt)}</h3>')
        parts.append(render_h2h_matrix(sh).replace(
            '<section>', '').replace(
            '<h2>Head-to-head win rates</h2>', '').replace(
            '<p class="note">Cell = fraction of fixtures where the ROW anchor '
            'beat the COLUMN anchor. Green &gt; 50 %, red &lt; 50 %. '
            'Bracketed count is (wins / matchups).</p>', '').replace(
            '</section>', ''))
    parts.append('</section>')
    return ''.join(parts)


html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ΔE — per-capture-normalized WB anchor comparison</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; margin: 24px; color: #222; }}
  h1 {{ margin: 0 0 4px; font-size: 22px; }}
  h2 {{ margin: 24px 0 6px; font-size: 16px; }}
  h3 {{ margin: 18px 0 4px; font-size: 13px; color: #555; }}
  .meta, .note {{ font-size: 12px; color: #666; margin: 4px 0 12px; }}
  section {{ margin: 16px 0 28px; }}
  table {{ border-collapse: collapse; font-size: 13px; margin: 8px 0; }}
  th, td {{ border: 1px solid #ddd; padding: 3px 10px; text-align: left; }}
  th {{ background: #f7f7f7; font-weight: 600; }}
  td.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
  td.h2h {{ text-align: center; min-width: 80px; }}
  td.diag {{ background: #f0f0f0; text-align: center; color: #999; }}
</style>
</head>
<body>
<h1>Per-capture-normalized ΔE comparison</h1>
<p class="meta">
  Source: <code>{escape(os.path.abspath(args.json))}</code><br>
  {len(captures)} captures → {len(multi_fixtures)} fixtures with ≥ 2 WB anchors.
  Removes "capture quality" (framing / focus / lighting) as a confound by
  comparing WB anchor variants WITHIN each shutter press.
</p>
{render_anchor_table(anchor_stats)}
{render_h2h_matrix(h2h)}
{render_h2h_by_slice(multi_fixtures)}
</body>
</html>
'''

os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
with open(args.out, 'w') as f:
    f.write(html)
print(f'wrote {args.out} ({len(html)/1024:.1f} KB)', file=sys.stderr)
