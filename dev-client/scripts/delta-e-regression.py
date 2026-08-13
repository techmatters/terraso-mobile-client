#!/usr/bin/env python3
"""
Multi-way OLS regression on per-chip ΔE.

Fits:
    delta_e ~ 1 + wb_anchor + device + format + bg
              + unevenness + expected_value + expected_chroma

Coefficients are the marginal effect of each factor *holding the
others constant*. Interpretation:

  - Reference levels (one per categorical) are absorbed in the
    intercept — for wb_anchor: 'self', for device: alphabetical,
    for format: 'photo', for bg: 'dark'.
  - β > 0 = worse than the reference level; β < 0 = better.
  - t = β / SE; |t| > 2 is roughly the classic 5 % significance
    threshold.
  - R² reports fraction of ΔE variance explained.

Ignores non-independence of chips within a capture. For a proper
mixed-effects model (chips within capture, capture within device)
you'd want statsmodels' mixedlm — not attempted here since we're
stdlib-only. Absolute coefficients are unbiased in OLS; only the
standard errors are optimistic (over-tight CIs). Rankings and signs
are still trustworthy.

Stdlib-only.
"""

import argparse
import collections
import json
import math
import os
import re
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


def bg_of(p: str) -> str:
    if 'LIGHT BG' in p: return 'light'
    if 'DARK BG' in p: return 'dark'
    return 'unknown'


VC_RE = re.compile(r'\b([\d.]+)\s*/\s*([\d.]+|N)\b')

def parse_vc(notation: str):
    m = VC_RE.search(notation)
    if m:
        try:
            return (float(m.group(1)),
                    0.0 if m.group(2) == 'N' else float(m.group(2)))
        except ValueError:
            pass
    m2 = re.match(r'^\s*N\s*([\d.]+)', notation)
    if m2:
        return (float(m2.group(1)), 0.0)
    return None


with open(args.json) as f:
    doc = json.load(f)
captures = doc.get('captures') or []

# Assemble rows: (features_dict, delta_e)
rows = []
for cap in captures:
    cells = cap.get('cells') or []
    if not cells:
        continue
    illum = (cap.get('registration') or {}).get('illumination') or {}
    uneven = illum.get('unevenness')
    if uneven is None:
        continue  # need this covariate
    for cell in cells:
        de = cell.get('delta_e')
        if de is None:
            continue
        vc = parse_vc(cell['expected_notation'])
        if not vc:
            continue
        rows.append({
            'wb': wb_anchor_of(cap),
            'device': device_of(cap['source_path']),
            'format': cap['capture_format'],
            'bg': bg_of(cap['source_path']),
            'uneven': uneven,
            'value': vc[0],
            'chroma': vc[1],
            'delta_e': de,
        })

print(f'loaded {len(rows)} chip measurements', file=sys.stderr)
if len(rows) < 20:
    print('too few rows for regression', file=sys.stderr)
    sys.exit(1)


# ---- Build design matrix -----------------------------------------------------

def levels(rows, key):
    return sorted({r[key] for r in rows})

wb_levels = levels(rows, 'wb')
dev_levels = levels(rows, 'device')
fmt_levels = levels(rows, 'format')
bg_levels = levels(rows, 'bg')

# Reference levels: try 'self' for wb, 'photo' for fmt, 'dark' for bg;
# fall back to first sorted otherwise.
ref_wb = 'self' if 'self' in wb_levels else wb_levels[0]
ref_dev = dev_levels[0]
ref_fmt = 'photo' if 'photo' in fmt_levels else fmt_levels[0]
ref_bg = 'dark' if 'dark' in bg_levels else bg_levels[0]

# Column names + how to compute each. First col is intercept.
col_names = ['(Intercept)']
col_meta = [('const', None, None)]  # (kind, key, level_or_none)

for lv in wb_levels:
    if lv == ref_wb: continue
    col_names.append(f'wb=[{lv}]')
    col_meta.append(('cat', 'wb', lv))
for lv in dev_levels:
    if lv == ref_dev: continue
    col_names.append(f'device=[{lv}]')
    col_meta.append(('cat', 'device', lv))
for lv in fmt_levels:
    if lv == ref_fmt: continue
    col_names.append(f'format=[{lv}]')
    col_meta.append(('cat', 'format', lv))
for lv in bg_levels:
    if lv == ref_bg: continue
    col_names.append(f'bg=[{lv}]')
    col_meta.append(('cat', 'bg', lv))
col_names.append('unevenness')
col_meta.append(('cont', 'uneven', None))
col_names.append('expected_value')
col_meta.append(('cont', 'value', None))
col_names.append('expected_chroma')
col_meta.append(('cont', 'chroma', None))

n = len(rows)
k = len(col_names)

def make_row(r):
    row = []
    for kind, key, lvl in col_meta:
        if kind == 'const':
            row.append(1.0)
        elif kind == 'cat':
            row.append(1.0 if r[key] == lvl else 0.0)
        else:  # cont
            row.append(float(r[key]))
    return row

X = [make_row(r) for r in rows]
y = [r['delta_e'] for r in rows]


# ---- Pure-python normal equations: β = (Xᵀ X)⁻¹ Xᵀ y -----------------------

def mat_transpose(A):
    return list(map(list, zip(*A)))

def mat_mul(A, B):
    # A: (m×n), B: (n×p) → (m×p)
    Bt = mat_transpose(B)
    return [
        [sum(a * b for a, b in zip(row, bcol)) for bcol in Bt]
        for row in A
    ]

def mat_vec(A, v):
    return [sum(a * b for a, b in zip(row, v)) for row in A]

def mat_inv(A):
    """Gauss–Jordan inverse. n×n → n×n. Raises on singular."""
    m = len(A)
    aug = [list(row) + [1.0 if i == j else 0.0 for j in range(m)]
           for i, row in enumerate(A)]
    for col in range(m):
        # Pick pivot (largest abs in current column, on-or-below diag)
        pivot = max(range(col, m), key=lambda r: abs(aug[r][col]))
        if abs(aug[pivot][col]) < 1e-12:
            raise ValueError(f'singular design matrix at column {col}')
        aug[col], aug[pivot] = aug[pivot], aug[col]
        piv = aug[col][col]
        aug[col] = [v / piv for v in aug[col]]
        for r in range(m):
            if r == col: continue
            factor = aug[r][col]
            if factor == 0.0: continue
            aug[r] = [aug[r][j] - factor * aug[col][j] for j in range(2 * m)]
    return [row[m:] for row in aug]


Xt = mat_transpose(X)
XtX = mat_mul(Xt, X)
XtX_inv = mat_inv(XtX)
Xty = mat_vec(Xt, y)
beta = mat_vec(XtX_inv, Xty)

# Residuals + σ²
y_hat = mat_vec(X, beta)
resid = [y[i] - y_hat[i] for i in range(n)]
rss = sum(r * r for r in resid)
y_mean = sum(y) / n
tss = sum((v - y_mean) ** 2 for v in y)
r_sq = 1 - rss / tss if tss > 0 else float('nan')
adj_r_sq = 1 - (rss / (n - k)) / (tss / (n - 1)) if (n - k) > 0 and tss > 0 else float('nan')
sigma2 = rss / (n - k) if (n - k) > 0 else float('nan')
se = [math.sqrt(sigma2 * XtX_inv[i][i]) for i in range(k)]
t_stat = [beta[i] / se[i] if se[i] > 0 else float('nan') for i in range(k)]

# ---- Approximate p-values from t via a normal-tail approximation ------------
# Good enough for n ≫ k; avoids importing scipy.
def norm_cdf_tail(t: float) -> float:
    # P(|Z| > |t|) for Z ~ N(0,1). Uses erfc from math.
    return math.erfc(abs(t) / math.sqrt(2))


p_val = [norm_cdf_tail(t) for t in t_stat]


# ---- Render -----------------------------------------------------------------

def render_coef_table() -> str:
    rows_html = []
    for i in range(k):
        p = p_val[i]
        # Star key like R
        stars = ('***' if p < 0.001 else '**' if p < 0.01
                 else '*' if p < 0.05 else '.' if p < 0.1 else '')
        rows_html.append(
            f'<tr><td>{escape(col_names[i])}</td>'
            f'<td class="num">{beta[i]:+.3f}</td>'
            f'<td class="num">{se[i]:.3f}</td>'
            f'<td class="num">{t_stat[i]:+.2f}</td>'
            f'<td class="num">{p:.3g}</td>'
            f'<td>{stars}</td></tr>'
        )
    return (
        '<table><thead><tr>'
        '<th>Coefficient</th><th>β</th><th>SE</th><th>t</th><th>p</th><th></th>'
        '</tr></thead><tbody>' + ''.join(rows_html) + '</tbody></table>'
    )


html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ΔE — OLS regression</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; margin: 24px; color: #222; }}
  h1 {{ margin: 0 0 4px; font-size: 22px; }}
  h2 {{ margin: 20px 0 6px; font-size: 15px; }}
  .meta, .note {{ font-size: 12px; color: #555; margin: 4px 0 12px; }}
  table {{ border-collapse: collapse; font-size: 13px; margin: 6px 0 16px; }}
  th, td {{ border: 1px solid #ddd; padding: 3px 10px; text-align: left; }}
  th {{ background: #f7f7f7; font-weight: 600; }}
  td.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
  code {{ font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; }}
</style>
</head>
<body>
<h1>OLS regression on ΔE</h1>
<p class="meta">
  Source: <code>{escape(os.path.abspath(args.json))}</code><br>
  n = {n} chips · k = {k} columns · reference levels:
  wb=<code>{escape(ref_wb)}</code>,
  device=<code>{escape(ref_dev)}</code>,
  format=<code>{escape(ref_fmt)}</code>,
  bg=<code>{escape(ref_bg)}</code>.
</p>

<h2>Fit quality</h2>
<table>
<tr><th>R²</th><td class="num">{r_sq:.4f}</td></tr>
<tr><th>Adjusted R²</th><td class="num">{adj_r_sq:.4f}</td></tr>
<tr><th>Residual σ</th><td class="num">{math.sqrt(sigma2):.3f}</td></tr>
<tr><th>n</th><td class="num">{n}</td></tr>
</table>

<h2>Coefficients</h2>
<p class="note">
  Each coefficient is the marginal effect on ΔE (in ΔE units) of that
  factor level (vs. its reference level), holding all others constant.
  β &lt; 0 = <b>reduces</b> ΔE (better); β &gt; 0 = <b>increases</b> ΔE (worse).
  Stars: *** p&lt;.001, ** p&lt;.01, * p&lt;.05, . p&lt;.10.
  <br>
  <b>Caveat</b>: chips within one capture are correlated (shared framing,
  focus, illumination). OLS treats them as independent, which
  <b>underestimates</b> standard errors — the p-values / significance
  stars are optimistic. Coefficient <i>magnitudes</i> and <i>signs</i>
  are still unbiased. For proper CIs use mixed-effects (statsmodels
  mixedlm); not attempted here.
</p>
{render_coef_table()}
</body>
</html>
'''

os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
with open(args.out, 'w') as f:
    f.write(html)
print(f'wrote {args.out} ({len(html)/1024:.1f} KB)', file=sys.stderr)
