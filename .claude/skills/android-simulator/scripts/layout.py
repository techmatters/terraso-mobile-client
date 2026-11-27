#!/usr/bin/env python3
"""Compact, privacy-filtered view of what's on the emulator screen, for agents driving the app (see ../SKILL.md).

Wraps `android layout` from Google's Android CLI: it fetches the UI element tree as JSON, keeps only the app's own windows, and prints one line per element (center coordinates, testID, visible text and/or accessibility label, and what it accepts) instead of ~9 KB of JSON per screen. If it catches the screen mid-change with no elements, it retries.

System windows are dropped because the status bar's content descriptions include notification text (email subjects, sign-in alerts) that shouldn't land in agent transcripts. Icon-font glyphs are dropped as noise.

Usage: layout.py [--device SERIAL] [--no-idle] [--raw FILE] [--wait-for VALUE [--timeout SECONDS]]
  --no-idle        don't wait for the UI to go idle (for screens that animate continuously)
  --raw FILE       also save the unfiltered JSON (includes system windows) for debugging
  --wait-for VALUE poll until an element's testID, text, or accessibility label equals VALUE (or matches /regex/), then print the list; exits 1 on timeout
  --timeout S      how long --wait-for polls (default 60)
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time

FLAG_NAMES = {
    "CLICKABLE": "tap",
    "LONG_CLICKABLE": "long",
    "EDITABLE": "edit",
    "SCROLLABLE": "scroll",
    "CHECKABLE": "check",
}
EMPTY_RETRIES = 3


def is_icon_glyph(s):
    # Icon fonts (MaterialIcons etc.) render from Unicode private-use code points.
    return all(0xE000 <= ord(c) <= 0xF8FF or ord(c) >= 0xF0000 for c in s)


def labels(node):
    # Prefixed with the selector key so a line can be pasted into `android input` selectors.
    found = []
    for key, selector in (("text", "text"), ("content-desc", "desc")):
        value = node.get(key, "").strip()
        if value and not is_icon_glyph(value):
            found.append(f'{selector}="{value}"')
    return found


def format_node(node):
    flags = [FLAG_NAMES[i] for i in node.get("interactions", []) if i in FLAG_NAMES]
    for state in ("checked", "selected", "focused"):
        if node.get(state):
            flags.append(state)
    test_id = node.get("resource-id", "")
    names = labels(node)
    if not (test_id or names or flags):
        return None
    parts = [node.get("center", "?").strip("[]")]
    if test_id:
        parts.append(f"#{test_id}")
    parts.extend(names or ["(no label)"])
    if flags:
        parts.append(f"[{','.join(flags)}]")
    return "  ".join(parts)


def fetch_layout(device, no_idle):
    fd, path = tempfile.mkstemp(suffix=".json")
    os.close(fd)
    cmd = ["android", "layout", "--no-metrics", "--flat", "-o", path]
    if device:
        cmd.append(f"--device={device}")
    if no_idle:
        cmd.append("--no-idle")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            sys.exit(f"android layout failed:\n{result.stdout}{result.stderr}")
        with open(path) as f:
            return json.load(f)
    finally:
        os.remove(path)


def render(windows):
    lines = []
    has_elements = False
    for window in windows:
        kind = window.get("type")
        if kind == "SYSTEM":
            continue
        if kind == "INPUT_METHOD":
            lines.append("== keyboard is open (covers the bottom of the screen)")
            continue
        focus = ", focused" if window.get("focused") else ""
        lines.append(f"== window {window.get('window-title', '')!r} ({kind}{focus})")
        for node in window.get("content", []):
            line = format_node(node)
            if line:
                lines.append("  " + line)
                has_elements = True
    return lines, has_elements


def make_matcher(pattern):
    # Same /regex/ convention as `android input` selectors. Plain values must match exactly so "Sites" doesn't match "Search sites".
    if len(pattern) > 1 and pattern.startswith("/") and pattern.endswith("/"):
        regex = re.compile(pattern[1:-1])
        return lambda value: regex.search(value) is not None
    return lambda value: value == pattern


def has_match(windows, matches):
    for window in windows:
        if window.get("type") in ("SYSTEM", "INPUT_METHOD"):
            continue
        for node in window.get("content", []):
            for key in ("resource-id", "text", "content-desc"):
                value = node.get(key, "").strip()
                if value and matches(value):
                    return True
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--device")
    parser.add_argument("--no-idle", action="store_true")
    parser.add_argument("--raw")
    parser.add_argument("--wait-for")
    parser.add_argument("--timeout", type=float, default=60)
    args = parser.parse_args()

    matches = make_matcher(args.wait_for) if args.wait_for else None
    deadline = time.monotonic() + args.timeout
    attempt = 0
    while True:
        attempt += 1
        windows = fetch_layout(args.device, args.no_idle)
        lines, has_elements = render(windows)
        if matches:
            done = has_match(windows, matches)
            give_up = time.monotonic() >= deadline
        else:
            # Mid-navigation, the app window can briefly be missing or empty.
            done = has_elements
            give_up = attempt >= EMPTY_RETRIES
        if done or give_up:
            break
        time.sleep(1)
    if args.raw:
        with open(args.raw, "w") as f:
            json.dump(windows, f)

    print("\n".join(lines))
    if matches and not done:
        print(f"== {args.wait_for!r} didn't appear within {args.timeout:g}s; the list above is the last screen seen.")
        sys.exit(1)
    if not has_elements:
        print(f"== no app elements after {EMPTY_RETRIES} tries; the app may be loading, crashed, or in the background. Take a screenshot.")


if __name__ == "__main__":
    main()
