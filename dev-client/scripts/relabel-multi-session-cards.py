#!/usr/bin/env python3
"""Relabel already-enriched MULTI-session captures by card token.

Sibling of rename-multi-session-fixtures.py. That script clusters raw
capture dumps by timestamp and assigns page names for the first time.
THIS script operates on captures that are already in the enriched
format (NN_device_CARD_ref_lightSLUG_kind[.ext]) — it just swaps the
`CARD` token per an old-label → new-label mapping supplied as JSON.
Useful when the labels were assigned wrong the first time (e.g. the
tester misremembered which chart page was in which session, or a
downstream visual check surfaced a mismatch).

Preserves:
  * The session sequence prefix (NN_) — order is chronological and
    doesn't depend on which page was actually in each session.
  * Every other token (device, ref, lightSLUG, kind, extension) —
    those aren't affected by a card-label correction.

Usage:
  scripts/relabel-multi-session-cards.py <folder> --mapping <json>
Add --apply to actually rename; without it, prints planned mv's only.

Mapping JSON format:
  {"5R": "10YR", "7.5YR": "7.5R", ...}
Keys are the current (wrong) card token; values are the corrected
one. Cards missing from the map are left unchanged.
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path


# NN_device_CARD_rest.ext — CARD is captured for lookup + replacement.
# Anchored so a match implies the file IS enriched (no false relabels
# on stray non-session files in the folder).
ENRICHED_RE = re.compile(
    r"^(?P<seq>\d{1,2})_(?P<device>[a-z0-9]+)_(?P<card>[^_]+)_(?P<rest>.+)$"
)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("folder", type=Path, help="folder of enriched captures")
    p.add_argument(
        "--mapping",
        type=Path,
        required=True,
        help="JSON dict mapping old CARD token → new CARD token",
    )
    p.add_argument(
        "--apply",
        action="store_true",
        help="perform renames; without this, prints planned mv's only",
    )
    return p.parse_args()


def load_mapping(path: Path) -> dict:
    with path.open() as f:
        data = json.load(f)
    if not isinstance(data, dict) or not all(
        isinstance(k, str) and isinstance(v, str) for k, v in data.items()
    ):
        sys.exit("error: mapping must be a JSON object of {str: str}")
    return data


def main() -> None:
    args = parse_args()
    if not args.folder.is_dir():
        sys.exit(f"error: {args.folder} is not a directory")
    mapping = load_mapping(args.mapping)
    identity = {k: v for k, v in mapping.items() if k == v}
    non_identity = {k: v for k, v in mapping.items() if k != v}
    print(f"mapping: {len(non_identity)} relabels, {len(identity)} identity")
    for old, new in sorted(non_identity.items()):
        print(f"  {old:<10} → {new}")

    plan: list[tuple[Path, Path]] = []
    unmatched_cards: set[str] = set()
    for p in sorted(args.folder.iterdir()):
        if not p.is_file():
            continue
        m = ENRICHED_RE.match(p.name)
        if not m:
            # Non-enriched file (e.g. results/, stray .json). Skip
            # quietly — this script only touches enriched captures.
            continue
        card = m.group("card")
        new_card = mapping.get(card)
        if new_card is None:
            unmatched_cards.add(card)
            continue
        if new_card == card:
            continue  # identity mapping — nothing to rename
        new_name = (
            f"{m.group('seq')}_{m.group('device')}_{new_card}_{m.group('rest')}"
        )
        plan.append((p, p.parent / new_name))

    if unmatched_cards:
        print(
            f"\nWARN: {len(unmatched_cards)} card token(s) in folder not "
            f"covered by the mapping (files left untouched):"
        )
        for c in sorted(unmatched_cards):
            print(f"  {c}")

    # Collision check: no target may already exist unless it's also a
    # source (chain rename). Preserving NN_ makes cross-session
    # collisions impossible in practice, but a bad mapping (two olds
    # pointing at the same new + same NN) would still hit us.
    sources = {src for src, _ in plan}
    existing = {p for p in args.folder.iterdir() if p.is_file()}
    collisions = [
        dst for _, dst in plan if dst in existing and dst not in sources
    ]
    if collisions:
        sys.exit(
            "error: target names collide with existing files:\n  "
            + "\n  ".join(str(c.name) for c in collisions[:8])
            + ("\n  …" if len(collisions) > 8 else "")
        )

    print(f"\n{'APPLYING' if args.apply else 'DRY RUN — plan'}: {len(plan)} renames")
    # Show first + last of each session-prefix group so the user can
    # visually confirm the whole sweep without printing all N files.
    by_seq: dict[str, list[tuple[Path, Path]]] = {}
    for src, dst in plan:
        seq = src.name.split("_", 1)[0]
        by_seq.setdefault(seq, []).append((src, dst))
    for seq in sorted(by_seq, key=lambda s: int(s)):
        entries = by_seq[seq]
        first_src, first_dst = entries[0]
        print(
            f"  {seq}: {first_src.name}\n"
            f"      → {first_dst.name}"
            f"  (+{len(entries) - 1} more in session)"
        )

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
