#!/usr/bin/env bash
#
# Batch report generator for the Munsell chart-validator fixtures.
# Runs analyze-fixtures (per-capture grid + JSON export) then
# render-munsell-error (polar error filmstrip) on a directory of
# DNG/JPEG captures, writing all outputs to `$FIXTURES/results/`.
# Opens the two HTMLs in the default browser when done.
#
# Usage:
#   scripts/report-munsell-fixtures.sh                   # gdrive default
#   scripts/report-munsell-fixtures.sh <fixtures-dir>    # custom
#
# Any additional args after the fixtures dir are forwarded to
# analyze-fixtures (e.g. --guide-shift-x -0.1 --guide-scale 0.9).

set -euo pipefail

DEFAULT_FIXTURES="$HOME/Library/CloudStorage/GoogleDrive-johannes@terraso.org/My Drive/Munsell/Multi Ref Device"

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

OUT="$FIXTURES/results"
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

echo
echo "==> outputs:"
ls -lh "$OUT"

echo
echo "==> opening reports …"
open "$OUT/run.html"
open "$OUT/munsell-error.html"
