#!/usr/bin/env python3
"""
Consolidated ΔE analysis — one HTML with tabbed sections.

Reads a run.json from analyze-fixtures, flattens to per-chip rows,
and produces a single self-contained HTML page:

  1. Summary — bootstrap group means with 95 % CI bars, faceted by
     WB anchor, device, format, background, page, and their crosses.
  2. Heatmap — per-chip Value × Chroma × WB anchor. Reveals which
     colour regions each WB anchor is good/bad at.
  3. Head-to-head — within-fixture WB anchor ranking. Removes
     capture-quality as a confounder.
  4. Regression (OLS) — multi-way linear fit. Shows each factor's
     marginal effect on ΔE holding others constant.
  5. Regression (Mixed-Effects) — same fit with a random intercept
     per capture, which properly accounts for chip-within-capture
     correlation. This is the statistically correct model — trust
     these p-values.
  6. Notes — methodology reminders and how to interpret.

Requires numpy + pandas + statsmodels; run via the venv:
  dev-client/.venv-analysis/bin/python scripts/delta-e-analysis.py \\
    --json <run.json> --out <delta-e-analysis.html>

Or invoke through scripts/report-munsell-fixtures.sh which uses the
venv automatically.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from html import escape

import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
import statsmodels.api as sm


# ---- CLI --------------------------------------------------------------------

ap = argparse.ArgumentParser()
ap.add_argument('--json', required=True, help='run.json from analyze-fixtures')
ap.add_argument('--out', required=True, help='output HTML path')
ap.add_argument('--n-bootstrap', type=int, default=1000,
                help='bootstrap resamples per group for the summary CIs')
ap.add_argument('--min-n', type=int, default=5,
                help='hide summary groups with fewer than this many chips')
ap.add_argument('--min-heatmap-n', type=int, default=3,
                help='hide heatmap cells with fewer than this many chips')
args = ap.parse_args()


# ---- Load + flatten ---------------------------------------------------------

def device_of(source_path: str) -> str:
    p = source_path
    if 'iPhone' in p:
        return 'iPhone'
    if 'Pixel 4' in p:
        return 'Pixel 4'
    if 'Pixel 6a' in p:
        return 'Pixel 6a'
    if 'Pixel 7' in p:
        return 'Pixel 7'
    return 'other'


def bg_of(source_path: str) -> str:
    if 'LIGHT BG' in source_path:
        return 'light'
    if 'DARK BG' in source_path:
        return 'dark'
    return 'unknown'


def platform_of(device: str) -> str:
    return 'ios' if device.startswith('iPhone') else 'android'


def wb_anchor_of(cap: dict) -> str:
    wb = cap.get('wb_correction') or {}
    if wb.get('source') == 'auto':
        return 'self'
    ref = wb.get('reference') or ''
    if ref.startswith('ref_card:'):
        return ref.split(':', 1)[1]
    return ref or '(none)'


VC_RE = re.compile(r'\b([\d.]+)\s*/\s*([\d.]+|N)\b')

def parse_vc(notation: str):
    """Munsell notation → (value, chroma). None if it doesn't parse."""
    m = VC_RE.search(notation)
    if m:
        try:
            v = float(m.group(1))
            c = 0.0 if m.group(2) == 'N' else float(m.group(2))
            return (v, c)
        except ValueError:
            pass
    m2 = re.match(r'^\s*N\s*([\d.]+)', notation)
    if m2:
        return (float(m2.group(1)), 0.0)
    return None


def load_df(json_path: str) -> pd.DataFrame:
    with open(json_path) as f:
        doc = json.load(f)
    captures = doc.get('captures') or []
    rows = []
    for cap in captures:
        cells = cap.get('cells') or []
        if not cells:
            continue
        illum = (cap.get('registration') or {}).get('illumination') or {}
        uneven = illum.get('unevenness')
        device = device_of(cap['source_path'])
        common = {
            'capture_id': cap['capture_id'],
            'label': cap['label'],
            'device': device,
            'platform': platform_of(device),
            'bg': bg_of(cap['source_path']),
            'format': cap['capture_format'],
            'wb_anchor': wb_anchor_of(cap),
            'ref_card_in_shot': cap.get('reference_card') or 'none',
            'page': cap['page'],
            'unevenness': uneven,
        }
        for cell in cells:
            de = cell.get('delta_e')
            if de is None:
                continue
            vc = parse_vc(cell['expected_notation'])
            rows.append({
                **common,
                'notation': cell['expected_notation'],
                'phys_row': cell.get('physical_row'),
                'phys_col': cell.get('physical_col'),
                'value': vc[0] if vc else np.nan,
                'chroma': vc[1] if vc else np.nan,
                'delta_e': de,
            })
    return pd.DataFrame(rows)


df = load_df(args.json)
print(f'loaded {len(df)} chip measurements from {df["capture_id"].nunique()} captures',
      file=sys.stderr)


# ---- Section 1: bootstrap-CI summary tables --------------------------------

def bootstrap_ci(vals: np.ndarray, n: int, rng: np.random.Generator) -> tuple[float, float, float]:
    if len(vals) == 0:
        return (float('nan'), float('nan'), float('nan'))
    mean = float(vals.mean())
    if len(vals) < 2:
        return (mean, mean, mean)
    idx = rng.integers(0, len(vals), size=(n, len(vals)))
    means = vals[idx].mean(axis=1)
    lo, hi = float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5))
    return (mean, lo, hi)


def summary_table(df: pd.DataFrame, keys: list[str], title: str) -> str:
    rng = np.random.default_rng(42)
    grouped = df.groupby(keys)['delta_e']
    entries = []
    for key, series in grouped:
        vals = series.to_numpy()
        if len(vals) < args.min_n:
            continue
        mean, lo, hi = bootstrap_ci(vals, args.n_bootstrap, rng)
        entries.append((mean, lo, hi, len(vals), key if isinstance(key, tuple) else (key,)))
    entries.sort(key=lambda e: e[0])
    if not entries:
        return f'<h3>{escape(title)}</h3><p><em>(no groups above n≥{args.min_n})</em></p>'
    global_lo = min(e[1] for e in entries)
    global_hi = max(e[2] for e in entries)
    span = max(global_hi - global_lo, 1e-6)
    header = (
        ''.join(f'<th>{escape(k)}</th>' for k in keys)
        + '<th>n</th><th>mean ΔE</th><th>95 % CI</th><th></th>'
    )
    tr = []
    for mean, lo, hi, n, key in entries:
        key_cells = ''.join(f'<td>{escape(str(k))}</td>' for k in key)
        left = (lo - global_lo) / span * 100
        width = (hi - lo) / span * 100
        mean_pct = (mean - global_lo) / span * 100
        bar = (
            f'<div class="ci-bar">'
            f'<div class="ci-range" style="left:{left:.1f}%; width:{width:.1f}%"></div>'
            f'<div class="ci-mean" style="left:{mean_pct:.1f}%"></div>'
            f'</div>'
        )
        tr.append(
            f'<tr>{key_cells}<td class="num">{n}</td>'
            f'<td class="num">{mean:.2f}</td>'
            f'<td class="num">{lo:.2f}–{hi:.2f}</td>'
            f'<td class="bar-cell">{bar}</td></tr>'
        )
    return (
        f'<h3>{escape(title)}</h3>'
        f'<table><thead><tr>{header}</tr></thead>'
        f'<tbody>{"".join(tr)}</tbody></table>'
    )


def render_summary(df: pd.DataFrame) -> str:
    tabs = [
        (['wb_anchor'], 'By WB anchor'),
        (['device'], 'By device'),
        (['platform'], 'By platform (iOS / Android)'),
        (['format'], 'By format (raw / photo)'),
        (['bg'], 'By background'),
        (['page'], 'By page'),
        (['device', 'format'], 'Device × format'),
        (['device', 'wb_anchor'], 'Device × WB anchor'),
        (['format', 'wb_anchor'], 'Format × WB anchor'),
        (['platform', 'wb_anchor'], 'Platform × WB anchor'),
        (['bg', 'wb_anchor'], 'Background × WB anchor'),
        (['device', 'format', 'wb_anchor'], 'Device × format × WB anchor'),
    ]
    parts = [
        '<p class="note">Each row: mean ΔE across chips in that group, '
        f'sorted ascending (best first). Bootstrap n = {args.n_bootstrap}. '
        'Non-overlapping CIs indicate a real difference.</p>'
    ]
    for keys, title in tabs:
        parts.append(summary_table(df, keys, title))
    return '\n'.join(parts)


# ---- Section 2: heatmap Value × Chroma per WB anchor -----------------------

def render_heatmap(df: pd.DataFrame) -> str:
    sub = df.dropna(subset=['value', 'chroma'])
    grid = (
        sub.groupby(['wb_anchor', 'value', 'chroma'])['delta_e']
        .agg(['mean', 'count'])
        .reset_index()
    )
    grid = grid[grid['count'] >= args.min_heatmap_n]
    if grid.empty:
        return '<p>(no heatmap data — no chips at ≥ min-n bins)</p>'
    global_min = float(grid['mean'].min())
    global_max = float(grid['mean'].max())
    anchors = sorted(grid['wb_anchor'].unique())
    values = sorted(sub['value'].unique(), reverse=True)
    chromas = sorted(sub['chroma'].unique())

    def color(de: float) -> str:
        t = 0 if global_max == global_min else max(
            0.0, min(1.0, (de - global_min) / (global_max - global_min)))
        hue = 120 * (1 - t)
        return f'hsl({hue:.0f}, 65%, 55%)'

    def panel(anchor: str) -> str:
        d = grid[grid['wb_anchor'] == anchor].set_index(['value', 'chroma'])
        header = ('<tr><th class="corner">V \\ C</th>'
                  + ''.join(f'<th>/{c:g}</th>' for c in chromas)
                  + '</tr>')
        body = []
        for v in values:
            cells = [f'<th>{v:g}/</th>']
            for c in chromas:
                key = (v, c)
                if key in d.index:
                    m = float(d.loc[key, 'mean'])
                    n = int(d.loc[key, 'count'])
                    cells.append(
                        f'<td class="cell" style="background:{color(m)}" '
                        f'title="ΔE {m:.1f}, n={n}">{m:.1f}</td>'
                    )
                else:
                    cells.append('<td class="empty"></td>')
            body.append(f'<tr>{"".join(cells)}</tr>')
        return (
            f'<div class="panel"><h3>{escape(anchor)}</h3>'
            f'<table class="heat">{header}{"".join(body)}</table></div>'
        )

    legend_cells = ''
    for i in range(11):
        de = global_min + (global_max - global_min) * i / 10
        legend_cells += (
            f'<div class="legend-cell" style="background:{color(de)}">'
            f'{de:.1f}</div>'
        )
    legend = f'<div class="legend"><span>ΔE scale:</span>{legend_cells}</div>'

    return (
        '<p class="note">Rows = Munsell Value (top = light). '
        'Columns = Chroma (left = neutral). One panel per WB anchor. '
        f'Shared colour scale {global_min:.1f}–{global_max:.1f}. '
        f'Cells with fewer than {args.min_heatmap_n} chips are blank.</p>'
        + legend
        + '<div class="panels">'
        + ''.join(panel(a) for a in anchors)
        + '</div>'
    )


# ---- Section 3: head-to-head within fixture --------------------------------

def render_head_to_head(df: pd.DataFrame) -> str:
    # Per (label, format) fixture: mean ΔE per WB anchor.
    per_variant = (
        df.groupby(['label', 'format', 'device', 'wb_anchor'])['delta_e']
        .mean()
        .reset_index()
    )
    # Fixtures with ≥ 2 anchors
    fixture_counts = per_variant.groupby(['label', 'format']).size()
    multi = fixture_counts[fixture_counts >= 2].index
    per_variant = per_variant.set_index(['label', 'format']).loc[multi].reset_index()
    if per_variant.empty:
        return '<p>(no fixtures with ≥ 2 WB anchors)</p>'

    # For each fixture (label × format), compute the best-variant ΔE
    # then per-row penalty + is_best flag. transform() keeps the
    # original index so we don't lose the grouping columns.
    best_per_fixture = per_variant.groupby(['label', 'format'])['delta_e'].transform('min')
    per_variant['penalty'] = per_variant['delta_e'] - best_per_fixture
    per_variant['is_best'] = per_variant['delta_e'] == best_per_fixture

    # Anchor-level summary
    anchor_sum = per_variant.groupby('wb_anchor').agg(
        appearances=('penalty', 'size'),
        wins=('is_best', 'sum'),
        mean_penalty=('penalty', 'mean'),
    ).reset_index()
    anchor_sum['win_pct'] = 100 * anchor_sum['wins'] / anchor_sum['appearances']
    anchor_sum = anchor_sum.sort_values('mean_penalty')

    anchor_table_rows = ''.join(
        f'<tr><td>{escape(r.wb_anchor)}</td>'
        f'<td class="num">{r.appearances}</td>'
        f'<td class="num">{r.win_pct:.1f} %</td>'
        f'<td class="num">{r.mean_penalty:.2f}</td></tr>'
        for r in anchor_sum.itertuples()
    )
    anchor_table = (
        '<h3>WB anchor: within-fixture summary</h3>'
        '<table><thead><tr>'
        '<th>WB anchor</th><th>fixtures</th><th>win rate</th>'
        '<th>mean ΔE penalty vs. best</th>'
        '</tr></thead><tbody>' + anchor_table_rows + '</tbody></table>'
    )

    # Head-to-head matrix (row beats col in what fraction of shared fixtures)
    anchors = sorted(per_variant['wb_anchor'].unique())
    pivot = per_variant.pivot_table(
        index=['label', 'format'], columns='wb_anchor', values='delta_e')
    matrix_rows = ''
    for a in anchors:
        cells = [f'<th>{escape(a)}</th>']
        for b in anchors:
            if a == b:
                cells.append('<td class="diag">—</td>')
                continue
            both = pivot[[a, b]].dropna()
            if both.empty:
                cells.append('<td class="num">·</td>')
                continue
            a_wins = int((both[a] < both[b]).sum())
            total = len(both)
            pct = 100 * a_wins / total
            hue = 120 if pct >= 50 else 0
            lightness = 100 - abs(pct - 50) * 0.6
            cells.append(
                f'<td class="h2h" '
                f'style="background:hsl({hue},70%,{lightness:.0f}%)">'
                f'{pct:.0f} %<br><small>({a_wins}/{total})</small></td>'
            )
        matrix_rows += f'<tr>{"".join(cells)}</tr>'
    matrix_html = (
        '<h3>Head-to-head win rate</h3>'
        '<p class="note">Cell = fraction of shared fixtures where the ROW '
        'anchor beat the COLUMN. Green &gt; 50 %, red &lt; 50 %.</p>'
        '<table><tr><th></th>'
        + ''.join(f'<th>vs {escape(a)}</th>' for a in anchors)
        + '</tr>'
        + matrix_rows
        + '</table>'
    )

    return anchor_table + matrix_html


# ---- Section 4/5: regression -----------------------------------------------

def build_reg_df(df: pd.DataFrame) -> pd.DataFrame:
    d = df.dropna(subset=['unevenness', 'value', 'chroma']).copy()
    # Set reference levels via Categorical for readable coefficient names.
    def cat(series, ref):
        levels = sorted(series.unique())
        if ref in levels:
            levels = [ref] + [l for l in levels if l != ref]
        return pd.Categorical(series, categories=levels, ordered=False)

    d['wb_anchor'] = cat(d['wb_anchor'], 'self')
    d['format'] = cat(d['format'], 'photo')
    d['bg'] = cat(d['bg'], 'dark')
    # Device: leave alphabetical (iPhone first).
    d['device'] = cat(d['device'], sorted(d['device'].unique())[0])
    return d


def render_ols(df: pd.DataFrame) -> str:
    d = build_reg_df(df)
    formula = ('delta_e ~ C(wb_anchor) + C(device) + C(format) + C(bg) '
               '+ unevenness + value + chroma')
    model = smf.ols(formula, data=d).fit()
    return (
        '<p class="note">Ordinary least squares. Each coefficient = the '
        'marginal effect on ΔE of that factor level (vs. its reference) '
        'holding all others constant. β &lt; 0 → reduces ΔE (better); '
        'β &gt; 0 → increases ΔE (worse).<br>'
        '<b>Caveat:</b> chips within a capture are correlated (same framing '
        '/ focus / lighting). OLS treats them as independent, so p-values '
        'are optimistic. Prefer the mixed-effects tab for inference; use '
        'this one for coefficient magnitudes.</p>'
        + render_reg_summary(model)
    )


def render_mixed(df: pd.DataFrame) -> str:
    d = build_reg_df(df)
    formula = ('delta_e ~ C(wb_anchor) + C(device) + C(format) + C(bg) '
               '+ unevenness + value + chroma')
    try:
        model = smf.mixedlm(formula, data=d, groups=d['capture_id']).fit(
            method='lbfgs', reml=True)
    except Exception as e:
        return f'<p class="note">mixed-effects fit failed: {escape(str(e))}</p>'
    note = (
        '<p class="note">Same formula as OLS but with a <b>random intercept '
        'per capture</b>. This properly accounts for the fact that all ~30 '
        'chips from one shutter share the same framing / focus / lighting '
        '— chips within a capture are not independent samples. Standard '
        'errors here are trustworthy; if a coefficient is significant here, '
        'you can believe it.</p>'
        f'<p class="note">Random intercept σ² (capture-level noise): '
        f'<b>{float(model.cov_re.iloc[0,0]):.3f}</b>. '
        f'Residual σ² (chip-level noise): '
        f'<b>{float(model.scale):.3f}</b>. '
        f'A large ratio means capture-quality dominates chip-level noise — '
        f'in which case improving framing / lighting matters more than '
        f'WB choice.</p>'
    )
    return note + render_reg_summary(model)


def render_reg_summary(model) -> str:
    params = model.params
    se = model.bse
    tvals = model.tvalues
    pvals = model.pvalues

    def stars(p: float) -> str:
        if p < 0.001: return '***'
        if p < 0.01: return '**'
        if p < 0.05: return '*'
        if p < 0.1: return '.'
        return ''

    rows = []
    for name in params.index:
        pretty = pretty_coef(name)
        p = float(pvals[name])
        rows.append(
            f'<tr><td>{escape(pretty)}</td>'
            f'<td class="num">{float(params[name]):+.3f}</td>'
            f'<td class="num">{float(se[name]):.3f}</td>'
            f'<td class="num">{float(tvals[name]):+.2f}</td>'
            f'<td class="num">{p:.3g}</td>'
            f'<td>{stars(p)}</td></tr>'
        )
    fit_bits = []
    if hasattr(model, 'rsquared'):
        fit_bits.append(f'R² = {model.rsquared:.4f}')
        fit_bits.append(f'adj R² = {model.rsquared_adj:.4f}')
    if hasattr(model, 'nobs'):
        fit_bits.append(f'n = {int(model.nobs)}')
    fit_bits.append(f'residual σ = {math.sqrt(model.scale):.3f}')
    fit_line = ' · '.join(fit_bits)

    return (
        f'<p class="fitline">{escape(fit_line)}</p>'
        '<table><thead><tr>'
        '<th>Coefficient</th><th>β</th><th>SE</th><th>t</th><th>p</th><th></th>'
        '</tr></thead><tbody>'
        + ''.join(rows)
        + '</tbody></table>'
        + '<p class="note">Stars: *** p&lt;.001, ** p&lt;.01, * p&lt;.05, . p&lt;.10.</p>'
    )


def pretty_coef(name: str) -> str:
    """Turn 'C(wb_anchor)[T.postit]' into 'wb_anchor = postit (vs self)' etc."""
    m = re.match(r'C\((\w+)\)\[T\.(.+?)\]$', name)
    if m:
        return f'{m.group(1)} = {m.group(2)}'
    m2 = re.match(r'C\((\w+)\)\[(.+?)\]$', name)
    if m2:
        return f'{m2.group(1)} = {m2.group(2)}'
    return name


# ---- Section: methodology notes --------------------------------------------

def render_notes() -> str:
    return '''
    <h3>What each tab tells you</h3>
    <ul>
      <li><b>Summary</b> — group means with bootstrap 95 % CIs. Best for
        quick "which level is best on average" questions.
        Non-overlapping CIs = real difference. Ignores interactions.</li>
      <li><b>Heatmap</b> — which colour regions each WB anchor is
        good/bad at. Answers "is postit bad everywhere, or just on
        yellows?".</li>
      <li><b>Head-to-head</b> — within-fixture ranking. Removes
        capture-quality (framing / focus / lighting) as a confounder.
        Two anchors on the SAME shutter get directly compared.</li>
      <li><b>Regression (OLS)</b> — coefficient magnitudes. Read
        cautiously: chips within a capture are correlated so p-values
        are too optimistic.</li>
      <li><b>Regression (Mixed-Effects)</b> — proper statistical model.
        Trust these p-values. If a coefficient is significant here, you
        can believe it.</li>
    </ul>
    <h3>How to read a regression coefficient</h3>
    <p>Each factor has one <b>reference level</b> absorbed into the
    intercept (defaults: WB = <code>self</code>, format = <code>photo</code>,
    bg = <code>dark</code>). Every other level gets a coefficient
    describing its offset from that reference, holding all other factors
    constant. Example: if <code>wb_anchor = postit</code> has β = +9.4,
    postit adds 9.4 ΔE units of error on average compared to self, no
    matter which device / format you use.</p>
    <p>Continuous covariates (unevenness, value, chroma) give effect
    per unit. β = +0.05 for <code>unevenness</code> means each unit of
    illumination unevenness adds 0.05 ΔE.</p>
    <h3>What still isn't in the data</h3>
    <ul>
      <li>Chip position within the chart (physical row / col) — could add
        as a covariate if you suspect certain corners are systematically
        harder to fit.</li>
      <li>Registration score / #inliers — a bad registration might
        inflate ΔE without being "capture quality" in the framing sense.</li>
      <li>Chromatic adaptation / illuminant CCT — if you tag captures
        with a colour temperature, we could add it as a covariate.</li>
    </ul>'''


# ---- Assemble tabbed HTML --------------------------------------------------

def tab_html(sections: list[tuple[str, str]]) -> str:
    """Radio-driven tabs — no JS."""
    n = len(sections)
    inputs = []
    labels = []
    panels = []
    for i, (name, content) in enumerate(sections):
        tid = f'tab-{i}'
        checked = ' checked' if i == 0 else ''
        inputs.append(f'<input type="radio" name="tab" id="{tid}"{checked}>')
        labels.append(f'<label for="{tid}">{escape(name)}</label>')
        panels.append(f'<div class="panel" data-tab="{tid}">{content}</div>')
    return (
        '<div class="tabs">'
        + ''.join(inputs)
        + '<div class="tabbar">' + ''.join(labels) + '</div>'
        + '<div class="tabcontent">' + ''.join(panels) + '</div>'
        + '</div>'
    )


sections = [
    ('Summary', render_summary(df)),
    ('Heatmap', render_heatmap(df)),
    ('Head-to-head', render_head_to_head(df)),
    ('Regression (OLS)', render_ols(df)),
    ('Regression (Mixed-Effects)', render_mixed(df)),
    ('Notes', render_notes()),
]

# CSS for the tabs uses :checked + sibling selectors. The layout only
# works because all inputs are direct children of .tabs and each panel
# is targeted via a matching data-tab attribute below.
tab_css = ''
for i in range(len(sections)):
    tab_css += (
        f'.tabs input[type=radio]:nth-of-type({i+1}):checked ~ .tabbar label:nth-of-type({i+1}) {{ '
        f'background:#fff; border-bottom-color:#fff; color:#111; font-weight:600; }}\n'
        f'.tabs input[type=radio]:nth-of-type({i+1}):checked ~ .tabcontent .panel[data-tab=tab-{i}] {{ display:block; }}\n'
    )

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ΔE analysis</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; margin: 24px; color: #222; }}
  h1 {{ margin: 0 0 4px; font-size: 22px; }}
  h2 {{ margin: 24px 0 8px; font-size: 16px; }}
  h3 {{ margin: 18px 0 8px; font-size: 14px; color: #333; }}
  .meta, .note, .fitline {{ font-size: 12px; color: #555; margin: 4px 0 12px; }}
  .fitline {{ font-weight: 600; color: #222; }}
  table {{ border-collapse: collapse; font-size: 13px; margin: 6px 0 20px; }}
  th, td {{ border: 1px solid #ddd; padding: 3px 10px; text-align: left; }}
  th {{ background: #f7f7f7; font-weight: 600; font-size: 12px; }}
  td.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
  td.bar-cell {{ min-width: 220px; padding: 0 8px; }}
  .ci-bar {{ position: relative; height: 14px; background: #f0f0f0; border-radius: 2px; }}
  .ci-range {{ position: absolute; top: 3px; height: 8px; background: #90c8ff; border-radius: 2px; }}
  .ci-mean {{ position: absolute; top: 0; width: 2px; height: 14px; background: #0a58ca; }}
  code {{ font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; background: #f4f4f4; padding: 1px 4px; border-radius: 2px; }}
  ul {{ font-size: 13px; line-height: 1.5; }}

  /* Heatmap */
  .panels {{ display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }}
  .panel h3 {{ margin: 0 0 6px; }}
  table.heat {{ border-collapse: collapse; font-size: 12px; font-variant-numeric: tabular-nums; }}
  table.heat th, table.heat td {{ border: 1px solid #ccc; padding: 2px 6px; text-align: center; }}
  table.heat th {{ background: #f5f5f5; font-weight: 600; color: #444; }}
  table.heat td.cell {{ min-width: 34px; color: #111; text-shadow: 0 0 2px rgba(255,255,255,.7); }}
  table.heat td.empty {{ background: #fafafa; }}
  .legend {{ display: flex; gap: 0; align-items: center; margin: 16px 0; font-size: 11px; }}
  .legend span {{ margin-right: 12px; font-weight: 600; }}
  .legend-cell {{ padding: 3px 6px; min-width: 34px; text-align: center; border: 1px solid #ccc; color: #111; text-shadow: 0 0 2px rgba(255,255,255,.7); font-variant-numeric: tabular-nums; }}

  /* h2h */
  td.h2h {{ text-align: center; min-width: 80px; font-variant-numeric: tabular-nums; }}
  td.diag {{ background: #f0f0f0; text-align: center; color: #999; }}

  /* Tabs */
  .tabs {{ margin-top: 16px; }}
  .tabs input[type=radio] {{ display: none; }}
  .tabbar {{ display: flex; gap: 2px; border-bottom: 1px solid #ccc; }}
  .tabbar label {{ padding: 8px 16px; cursor: pointer; border: 1px solid #ccc; border-bottom: none;
                   background: #f4f4f4; color: #555; font-size: 13px; border-radius: 4px 4px 0 0;
                   margin-bottom: -1px; }}
  .tabbar label:hover {{ background: #eaeaea; }}
  .tabcontent {{ border: 1px solid #ccc; border-top: none; padding: 16px 20px; background: #fff; border-radius: 0 4px 4px 4px; }}
  .tabs .panel {{ display: none; }}
{tab_css}
</style>
</head>
<body>
<h1>ΔE analysis</h1>
<p class="meta">
  Source: <code>{escape(os.path.abspath(args.json))}</code><br>
  {len(df)} chip measurements across {df["capture_id"].nunique()} captures ·
  {df["label"].nunique()} unique fixtures · devices: {escape(", ".join(sorted(df["device"].unique())))}.
</p>
{tab_html(sections)}
</body>
</html>
'''

os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
with open(args.out, 'w') as f:
    f.write(html)
print(f'wrote {args.out} ({len(html)/1024:.1f} KB)', file=sys.stderr)
