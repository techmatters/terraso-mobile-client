#!/usr/bin/env node

/**
 * Filters noisy iOS simulator log messages from stdin.
 *
 * All patterns use block suppression: when a line matches, it and all
 * subsequent continuation lines are suppressed until '}}' (end of an NSError
 * dump) or a new log entry begins, whichever comes first. This handles both
 * genuinely multi-line messages (NSError dumps) and single-line messages that
 * the OS log streamer splits across lines when piped.
 *
 * To add a new pattern, just add a regex to NOISE_PATTERNS. No need to worry
 * about whether the message might be split — block suppression handles it.
 *
 * Usage: some_command 2>&1 | node scripts/filter-ios-logs.js [--debug]
 *   --debug: show all lines, prefixing filtered ones with     [filtered]
 */

const readline = require('readline');

const debug = process.argv.includes('--debug');

// Lines matching any of these start a suppressed block.
const NOISE_PATTERNS = [
  /CoreHaptics/,
  /CHHapticPattern/,
  /_UIKBFeedbackGenerator/,
  /UIKeyboardLayoutStar/,
  /\[MapboxCommon\]/,
  /Could not find view with tag/,
  /hapticpatternlibrary\.plist/,
  /NSCocoaErrorDomain/,
];

// A line matching this is the start of a new log entry, ending any suppressed
// block. Covers iOS log prefixes ([Framework]), React Native prefixes
// (LOG/WARN/ERROR), and Metro bundler output.
const NEW_ENTRY_PATTERN = /^\[|^ (LOG|WARN|ERROR) |^>/;

let inBlock = false;

function emit(line) {
  process.stdout.write(line + '\n');
}

function suppress(line) {
  if (debug) {
    emit('    [filtered] ' + line);
  }
}

const rl = readline.createInterface({input: process.stdin});

rl.on('line', line => {
  if (NOISE_PATTERNS.some(p => p.test(line))) {
    inBlock = true;
    suppress(line);
    return;
  }

  if (inBlock) {
    if (line.includes('}}')) {
      inBlock = false;
      suppress(line);
      return;
    }
    if (NEW_ENTRY_PATTERN.test(line)) {
      inBlock = false;
      // fall through to print
    } else {
      suppress(line);
      return;
    }
  }

  emit(line);
});
