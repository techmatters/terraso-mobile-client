#!/usr/bin/env python3
"""
Regression-only ΔE analysis — one HTML with two regression tabs.

Reads a run.json from analyze-fixtures, flattens to per-chip rows,
fits two models, and produces a single self-contained HTML page:

  1. Regression (OLS) — multi-way linear fit. Shows each factor's
     marginal effect on ΔE holding others constant. p-values are
     optimistic because chips within a capture are correlated.
  2. Regression (Mixed-Effects) — same fit with a random intercept
     per capture, which properly accounts for chip-within-capture
     correlation. This is the statistically correct model — trust
     these p-values.
  3. Notes — methodology reminders and how to interpret.

The Summary / Heatmap / Head-to-head tabs that used to live here
have been replaced by the interactive explorer in
scripts/render-munsell-error.ts (open munsell-error.html and pick
"chart = heatmap" in the left panel).

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


# ---- CLI --------------------------------------------------------------------

ap = argparse.ArgumentParser()
ap.add_argument('--json', required=True, help='run.json from analyze-fixtures')
ap.add_argument('--out', required=True, help='output HTML path')
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


_KNOWN_SLOTS = frozenset({'whibal', 'postit', 'greycard'})

def wb_anchor_of(cap: dict) -> str:
    wb = cap.get('wb_correction') or {}
    if wb.get('source') == 'auto':
        return 'self'
    ref = wb.get('reference') or ''
    if ref.startswith('ref_card:'):
        return ref.split(':', 1)[1]
    # analyze-fixtures sometimes writes a bare slot name when the multi
    # lookup fell through — accept those too so they don't leak as the
    # physical reference_card fallback (e.g. "multi").
    if ref in _KNOWN_SLOTS:
        return ref
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


# ---- Regression -------------------------------------------------------------

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


# ---- Methodology notes ------------------------------------------------------

def render_notes() -> str:
    return '''
    <h3>What each tab tells you</h3>
    <ul>
      <li><b>Regression (OLS)</b> — coefficient magnitudes. Read
        cautiously: chips within a capture are correlated so p-values
        are too optimistic.</li>
      <li><b>Regression (Mixed-Effects)</b> — proper statistical model.
        Trust these p-values. If a coefficient is significant here, you
        can believe it.</li>
    </ul>
    <h3>Descriptive views live in the filmstrip explorer</h3>
    <p>Group means, per-cell heatmaps, and head-to-head comparisons all
    moved to the interactive explorer in <code>munsell-error.html</code>.
    Open that page, pick <b>chart = heatmap</b> in the left panel, and
    choose any pair of row/col axes (WB anchor × device, Munsell value ×
    chroma, format × page, etc.). Filters (device, background paper,
    illuminant, format, max unevenness, ref-card × page grid) apply to
    both the polar-disk and heatmap views, so you can drill into a
    subset before summarising it.</p>
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
<title>ΔE regression</title>
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
  code {{ font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; background: #f4f4f4; padding: 1px 4px; border-radius: 2px; }}
  ul {{ font-size: 13px; line-height: 1.5; }}

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
<h1>ΔE regression</h1>
<p class="meta">
  Source: <code>{escape(os.path.abspath(args.json))}</code><br>
  {len(df)} chip measurements across {df["capture_id"].nunique()} captures ·
  {df["label"].nunique()} unique fixtures · devices: {escape(", ".join(sorted(df["device"].unique())))}.<br>
  Descriptive summaries / heatmaps / head-to-head are now in
  <code>munsell-error.html</code> — pick <b>chart = heatmap</b> in the
  left panel.
</p>
{tab_html(sections)}
</body>
</html>
'''

os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
with open(args.out, 'w') as f:
    f.write(html)
print(f'wrote {args.out} ({len(html)/1024:.1f} KB)', file=sys.stderr)
