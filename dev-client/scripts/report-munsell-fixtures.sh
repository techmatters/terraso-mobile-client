#!/usr/bin/env bash
#
# Batch report generator for the Munsell chart-validator fixtures.
# Runs analyze-fixtures (per-capture grid + JSON export) then
# render-munsell-error (polar error filmstrip) on a directory of
# DNG/JPEG captures, writing all outputs to the results dir
# (`$FIXTURES/results/` by default, or --out-dir).
# Opens the two HTMLs in the default browser when done.
#
# Usage:
#   scripts/report-munsell-fixtures.sh                        # gdrive default
#   scripts/report-munsell-fixtures.sh <fixtures-dir>         # custom
#   scripts/report-munsell-fixtures.sh <fixtures-dir> --out-dir <dir>
#
# --out-dir <dir>  Write run.json + the HTML reports here instead of
#                  $FIXTURES/results. Consumed by this wrapper (not
#                  forwarded). Any OTHER args after the fixtures dir are
#                  forwarded to analyze-fixtures (e.g. --guide-shift-x
#                  -0.1 --guide-scale 0.9).

set -euo pipefail

DEFAULT_FIXTURES="$HOME/Library/CloudStorage/GoogleDrive-johannes@terraso.org/.shortcut-targets-by-id/1yID-VPBZVoe2kpynavVfCWmhQ2SEyIEB/Multi Ref, Device, Capture"

# First arg is the fixtures dir UNLESS it starts with "--" (in which
# case it's an analyze-fixtures flag and we use the default dir).
# Lets `scripts/report-munsell-fixtures.sh --override-ref multi` work
# against the gdrive default without repeating the long path.
if [ $# -gt 0 ] && [[ "$1" != --* ]]; then
  FIXTURES="$1"
  shift
else
  FIXTURES="$DEFAULT_FIXTURES"
fi

if [ ! -d "$FIXTURES" ]; then
  echo "error: fixtures dir not found: $FIXTURES" >&2
  exit 1
fi

# Pull --out-dir out of the remaining args (it's ours, not an
# analyze-fixtures flag). Everything else is left in PASSTHRU to
# forward verbatim. Default output dir is $FIXTURES/results.
OUT="$FIXTURES/results"
PASSTHRU=()
while [ $# -gt 0 ]; do
  case "$1" in
    --out-dir)
      if [ $# -lt 2 ]; then
        echo "error: --out-dir requires a directory argument" >&2
        exit 1
      fi
      OUT="$2"
      shift 2
      ;;
    --out-dir=*)
      OUT="${1#*=}"
      shift
      ;;
    *)
      PASSTHRU+=("$1")
      shift
      ;;
  esac
done
# Guard empty-array expansion for bash 3.2 (macOS default) under set -u.
set -- ${PASSTHRU[@]+"${PASSTHRU[@]}"}

mkdir -p "$OUT"

# Locate dev-client (this script lives in dev-client/scripts/).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_CLIENT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> fixtures:  $FIXTURES"
echo "==> results:   $OUT"
if [ $# -gt 0 ]; then
  echo "==> extra args: $*"
fi
echo

cd "$DEV_CLIENT"

# Per-capture grid + JSON. Passes any extra args through so callers
# can tweak the shift/scale knobs without editing this script.
echo "==> analyze-fixtures …"
npm run analyze-fixtures -- \
  --fixtures "$FIXTURES" \
  --out "$OUT/run.json" \
  "$@"

# Munsell-error filmstrip built from the JSON above.
echo
echo "==> render-munsell-error …"
npm run render-munsell-error -- \
  --json "$OUT/run.json" \
  --out "$OUT/munsell-error.html"

# Consolidated ΔE analysis. Uses the .venv-analysis Python environment
# with pandas / numpy / statsmodels (see scripts/setup-analysis-venv.sh
# if you haven't set it up yet — the script self-heals below).
VENV_PY="$DEV_CLIENT/.venv-analysis/bin/python"
if [ ! -x "$VENV_PY" ]; then
  echo "==> setting up .venv-analysis (first run) …"
  python3.13 -m venv "$DEV_CLIENT/.venv-analysis"
  "$DEV_CLIENT/.venv-analysis/bin/pip" install --quiet numpy pandas statsmodels
fi
echo
echo "==> delta-e-analysis (regression: OLS + mixed-effects) …"
"$VENV_PY" "$SCRIPT_DIR/delta-e-analysis.py" \
  --json "$OUT/run.json" \
  --out "$OUT/delta-e-analysis.html"

echo
echo "==> outputs:"
ls -lh "$OUT"

echo
echo "==> opening results folder in Finder …"
open "$OUT"
