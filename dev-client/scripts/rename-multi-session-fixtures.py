#!/usr/bin/env python3
"""Rename MULTI-session DNG/JPG captures to enriched session filenames.

Bulk-renames a folder of pre-enrichment MULTI captures (bare
`burst1of5_auto.dng` / `manual_iso100_shut33ms.jpg` style names —
downloaded from a phone that ran on a build before the enriched-
filename change landed) into the current session-mode format:

    01_pixel7_10YR_multi_lightshade_auto_burst1of5.dng

Clustering is done from EXIF DateTimeOriginal: any two files whose
timestamps are within GAP_SECONDS of each other are the same session.
Each 9-shot session (5 auto burst + 4 manual) gets its own seq
number. DNG/JPG pairing is by shared timestamp, NOT by any
filesystem or Google-Drive disambiguator suffix — those are unrelated
to what the phone actually captured together.

Page identification per session is user-supplied via a JSON mapping:

    {
      "device": "pixel7",           # required
      "illuminant": "shade",        # required (baked as `light<slug>`)
      "refCard": "multi",           # required (see REFERENCE_TOKENS)
      "pages": ["5R", "7.5YR", ...] # one entry per session, chronological
    }

Runs in dry-run mode by default (prints planned mv's, does not touch
files). Pass --apply to actually rename. All operations are within
one folder — no cross-folder moves.

Safety:
  * Refuses to run if any file in the folder already looks session-
    enriched (leading NN_devicename_pageName pattern). Prevents
    double-renaming.
  * Aborts if the number of clusters != len(pages) — mapping must
    match reality exactly.
  * Aborts if any target filename collides with an existing file.
"""

import argparse
import datetime
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable, List, Tuple


GAP_SECONDS = 30
# Any leading token matching this is treated as "already enriched" and
# blocks the run. The token is `NN_` (session sequence) as emitted by
# CameraSessionManager.buildSessionShotStem.
ALREADY_ENRICHED_RE = re.compile(r"^\d{1,2}_")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("folder", type=Path, help="folder of unpacked MULTI captures")
    p.add_argument(
        "--pages",
        type=Path,
        required=True,
        help="JSON with {device, illuminant, refCard, pages: [...]}",
    )
    p.add_argument(
        "--apply",
        action="store_true",
        help="perform the renames; without this flag, prints planned mv's only",
    )
    return p.parse_args()


def load_mapping(path: Path) -> dict:
    with path.open() as f:
        data = json.load(f)
    for k in ("device", "illuminant", "refCard", "pages"):
        if k not in data:
            sys.exit(f"error: pages JSON missing required field '{k}'")
    if not isinstance(data["pages"], list) or not all(
        isinstance(p, str) for p in data["pages"]
    ):
        sys.exit("error: 'pages' must be a list of strings")
    return data


def extract_exif(folder: Path) -> List[Tuple[datetime.datetime, Path]]:
    """Return sorted (DateTimeOriginal, path) tuples for every dng+jpg."""
    files = sorted(
        [
            p
            for p in folder.iterdir()
            if p.is_file() and p.suffix.lower() in {".dng", ".jpg"}
        ]
    )
    if not files:
        sys.exit(f"error: no .dng or .jpg files in {folder}")
    args = [
        "exiftool",
        "-q",
        "-s",
        "-T",
        "-DateTimeOriginal",
        *[str(p) for p in files],
    ]
    out = subprocess.check_output(args, encoding="utf-8")
    lines = out.rstrip("\n").split("\n")
    if len(lines) != len(files):
        sys.exit(
            f"error: exiftool returned {len(lines)} lines for {len(files)} files"
        )
    rows: List[Tuple[datetime.datetime, Path]] = []
    for path, line in zip(files, lines):
        line = line.strip()
        if line == "-":
            sys.exit(f"error: no DateTimeOriginal in {path.name}")
        ts = datetime.datetime.strptime(line, "%Y:%m:%d %H:%M:%S")
        rows.append((ts, path))
    rows.sort()
    return rows


def cluster_by_gap(
    rows: Iterable[Tuple[datetime.datetime, Path]], gap: int
) -> List[List[Tuple[datetime.datetime, Path]]]:
    clusters: List[List[Tuple[datetime.datetime, Path]]] = []
    cur: List[Tuple[datetime.datetime, Path]] = []
    for r in rows:
        if not cur:
            cur = [r]
            continue
        if (r[0] - cur[-1][0]).total_seconds() > gap:
            clusters.append(cur)
            cur = [r]
        else:
            cur.append(r)
    if cur:
        clusters.append(cur)
    return clusters


def stem_kind(fn: str) -> str:
    """Strip Drive's `(N)` disambiguator + extension."""
    stem = Path(fn).stem
    return re.sub(r"\s*\(\d+\)$", "", stem)


def enriched_name(
    seq_pad: int,
    seq: int,
    device: str,
    page: str,
    ref_card: str,
    illuminant: str,
    kind: str,
    ext: str,
) -> str:
    """Compose the session-enriched filename.

    Mirrors CameraSessionManager.buildSessionShotStem's layout so
    analyze-fixtures parses it the same way:
      <seq>_<device>_<page>_<ref>_light<illum>_<kind>[_iso..._shut...]

    For burst frames, kind is `auto_burstNofM`; for manual shots,
    kind carries the iso/shutter suffix already.
    """
    seq_s = str(seq).zfill(seq_pad)
    m = re.match(r"burst(\d+)of(\d+)_auto$", kind)
    if m:
        tail = f"auto_burst{m.group(1)}of{m.group(2)}"
    elif kind.startswith("manual_"):
        tail = kind
    else:
        # Unknown shot kind — keep verbatim so nothing is dropped
        # silently. Analyzer will skip if it doesn't recognise.
        tail = kind
    return (
        f"{seq_s}_{device}_{page}_{ref_card}_light{illuminant}_{tail}.{ext}"
    )


def plan_renames(
    clusters: List[List[Tuple[datetime.datetime, Path]]],
    mapping: dict,
) -> List[Tuple[Path, Path]]:
    if len(clusters) != len(mapping["pages"]):
        sys.exit(
            f"error: mapping has {len(mapping['pages'])} pages but folder has "
            f"{len(clusters)} sessions — mapping must match exactly"
        )
    seq_pad = 2 if len(clusters) >= 10 else 1
    plan: List[Tuple[Path, Path]] = []
    for i, cluster in enumerate(clusters, 1):
        page = mapping["pages"][i - 1]
        # Sanity: each kind should have exactly one dng + one jpg in
        # this cluster's time window. Report + skip on mismatch so a
        # partial or noisy folder doesn't corrupt the rename.
        by_kind: dict = {}
        for _, path in cluster:
            k = stem_kind(path.name)
            slot = by_kind.setdefault(k, {"dng": [], "jpg": []})
            ext = path.suffix.lower().lstrip(".")
            if ext in slot:
                slot[ext].append(path)
        for k in sorted(by_kind):
            dngs = by_kind[k]["dng"]
            jpgs = by_kind[k]["jpg"]
            if len(dngs) != 1 or len(jpgs) != 1:
                print(
                    f"  session {i} ({page}) kind={k}: "
                    f"dngs={[p.name for p in dngs]} "
                    f"jpgs={[p.name for p in jpgs]}",
                    file=sys.stderr,
                )
                continue
            for path in dngs + jpgs:
                ext = path.suffix.lower().lstrip(".")
                new_name = enriched_name(
                    seq_pad=seq_pad,
                    seq=i,
                    device=mapping["device"],
                    page=page,
                    ref_card=mapping["refCard"],
                    illuminant=mapping["illuminant"],
                    kind=k,
                    ext=ext,
                )
                plan.append((path, path.parent / new_name))
    return plan


def main() -> None:
    args = parse_args()
    if not args.folder.is_dir():
        sys.exit(f"error: {args.folder} is not a directory")
    mapping = load_mapping(args.pages)

    # Refuse to run on an already-enriched folder — every filename
    # would double-prefix, and pairing by timestamp would still work
    # but the analyzer would see junk.
    for p in args.folder.iterdir():
        if p.is_file() and ALREADY_ENRICHED_RE.match(p.name):
            sys.exit(
                f"error: {p.name} looks already-enriched (leading NN_). "
                "Refusing to run to avoid double-prefixing."
            )

    rows = extract_exif(args.folder)
    print(f"scanning {len(rows)} files in {args.folder}")
    clusters = cluster_by_gap(rows, GAP_SECONDS)
    print(f"clustered into {len(clusters)} sessions (gap threshold {GAP_SECONDS}s)")

    plan = plan_renames(clusters, mapping)

    # Check for collisions BEFORE applying so an already-in-progress
    # rename doesn't clobber files.
    targets = [dst for _, dst in plan]
    existing = {p for p in args.folder.iterdir() if p.is_file()}
    sources = {src for src, _ in plan}
    collisions = [
        dst
        for dst in targets
        if dst in existing and dst not in sources
    ]
    if collisions:
        sys.exit(
            "error: target names collide with existing files:\n  "
            + "\n  ".join(str(c.name) for c in collisions[:8])
            + ("\n  ..." if len(collisions) > 8 else "")
        )

    print(f"\n{'APPLYING' if args.apply else 'DRY RUN — plan'}: {len(plan)} renames")
    for src, dst in plan[:6]:
        print(f"  {src.name}\n    → {dst.name}")
    if len(plan) > 6:
        print(f"  … and {len(plan) - 6} more")

    if not args.apply:
        print("\n(dry run — no files touched; pass --apply to rename)")
        return

    for src, dst in plan:
        if not src.exists():
            print(f"  WARN: source missing at rename time: {src.name}")
            continue
        os.rename(src, dst)
    print(f"\ndone: renamed {len(plan)} files")


if __name__ == "__main__":
    main()
