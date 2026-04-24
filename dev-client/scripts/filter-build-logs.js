#!/usr/bin/env node

/**
 * Filters noisy lines from iOS / Android build + runtime output on stdin.
 * Covers xcodebuild + Metro + iOS simulator logs on the iOS side, and Gradle
 * + Kotlin/Java compiler + Metro + logcat-like output on the Android side.
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
 * Usage: some_command 2>&1 | node scripts/filter-build-logs.js [--debug]
 *   --debug: show all lines, prefixing filtered ones with     [filtered]
 */

const readline = require('readline');

// Defensive: force synchronous stdout in case this filter is ever invoked
// as a non-terminal pipeline stage. When stdout is a TTY (the common case
// in rebuild_all) Node already writes synchronously, so this is a no-op.
if (process.stdout._handle && typeof process.stdout._handle.setBlocking === 'function') {
  process.stdout._handle.setBlocking(true);
}

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
  /\bi18next:/,
  /will be run during every build/,
  /VP8LPredictor/,
  // npm install chatter — transitive deprecations dragged in by RN/Expo/Jest/
  // react-devtools that aren't actionable from this repo. Re-check when any
  // of those ecosystems bump.
  /npm warn skipping integrity check/,
  /npm warn deprecated inflight@/,
  /npm warn deprecated lodash\./,
  /npm warn deprecated rimraf@/,
  /npm warn deprecated glob@/,
  /npm warn deprecated abab@/,
  /npm warn deprecated domexception@/,
  /npm warn deprecated boolean@/,
  // iOS simulator app_launch_measurement telemetry that always fails to send
  // from the simulator. Harmless Apple-internal chatter.
  /Failed to send CA Event/,
  // Android: Kotlin compiler warnings from 3rd-party libraries (node_modules).
  // All upstream issues — can't fix locally. Own-code Kotlin warnings still
  // surface because they don't match this path.
  /^w: file:\/\/.*\/node_modules\//,
  // Android: react-native-mmkv's self-promo lines on every build.
  /^\[react-native-mmkv\]/,
  // Android: javac info about 3rd-party library deprecations / unchecked ops.
  /uses or overrides a deprecated API\.$/,
  /uses unchecked or unsafe operations\.$/,
  /^Note: Recompile with -Xlint:/,
  /^Note: Some input files use/,
  // Android: React Native codegen "no components in this lib" info.
  /^No modules to process in combine-js-to-schema-cli/,
  // Android: 3rd-party library AndroidManifest namespace deprecation (4-line
  // block; block suppression terminates on the next `> Task :` line).
  /package=".*" found in source AndroidManifest\.xml/,
  // Android: manifest merger warns on every `tools:node="remove"` or
  // `tools:replace` that's a no-op this build. Our app.config.ts's
  // blockedPermissions list intentionally leaves dormant entries as
  // insurance against future library updates (see commit message on this
  // filter entry for details). The warning is by-design behavior, not a
  // real problem. Two-line block: a path preamble then this detail line —
  // the preamble above handles the first line via AndroidManifest.xml
  // Warning: pattern.
  /was tagged at AndroidManifest\.xml:\d+ to (remove|replace) other declarations but no other declaration present/,
];

// A line matching this is the start of a new log entry, ending any suppressed
// block. Covers iOS log prefixes ([Framework]), React Native prefixes
// (LOG/WARN/ERROR/INFO/DEBUG), Metro bundler output (>), xcbeautify step
// prefix (› = U+203A), Metro bundle progress (iOS ./index.js ▓...),
// npm CLI output (any npm line), Kotlin compiler warnings (w:), and blank
// lines.
const NEW_ENTRY_PATTERN = /^\[|^ (LOG|WARN|ERROR|INFO|DEBUG) |^[>›]|^iOS |^Android |^npm |^w: |^\s*$/;

// Some warnings have a generic banner whose identifying detail only arrives
// a few lines later. Buffer these until we can see whether the following
// lines match a noise pattern; if so, drop the whole block (banner +
// contents). Otherwise flush.
//
// Covers:
// - Xcode project warnings: "⚠️  (ios/*.xcodeproj:)" preamble
// - Android manifest merger warnings: "<path>AndroidManifest.xml Warning:"
const PREAMBLE_PATTERN = /^⚠️\s+\(ios\/.*\.xcodeproj:\)|AndroidManifest\.xml[^ ]* Warning:$/;
const PREAMBLE_MAX_LINES = 6;

let inBlock = false;
let preambleBuffer = [];

// Metro (and some other tools) emit ANSI color codes when writing to a TTY,
// which the PTY wrapper gives them. That means the raw line has codes like
// "\x1b[1miOS\x1b[22m \x1b[32mBundled\x1b[39m ..." — anchored regexes like
// ^\[ and substring matches like `[MapboxCommon]` still work sometimes by
// coincidence, but ^iOS, ^ LOG, and similar miss. Strip CSI codes for all
// pattern matching while still emitting the original (colored) line so the
// terminal renders as intended.
const ansiCsi = /\x1b\[[0-9;]*[a-zA-Z]/g;
const stripAnsi = s => s.replace(ansiCsi, '');

function emit(line) {
  process.stdout.write(line + '\n');
}

function suppress(line) {
  if (debug) {
    emit('    [filtered] ' + line);
  }
}

function flushPreamble() {
  for (const l of preambleBuffer) emit(l);
  preambleBuffer = [];
}

function dropPreamble() {
  for (const l of preambleBuffer) suppress(l);
  preambleBuffer = [];
}

const rl = readline.createInterface({input: process.stdin});

rl.on('line', line => {
  const plain = stripAnsi(line);

  if (preambleBuffer.length > 0) {
    preambleBuffer.push(line);
    if (NOISE_PATTERNS.some(p => p.test(plain))) {
      dropPreamble();
      return;
    }
    if (preambleBuffer.length >= PREAMBLE_MAX_LINES) {
      flushPreamble();
    }
    return;
  }

  if (PREAMBLE_PATTERN.test(plain)) {
    preambleBuffer.push(line);
    return;
  }

  if (NOISE_PATTERNS.some(p => p.test(plain))) {
    inBlock = true;
    suppress(line);
    return;
  }

  if (inBlock) {
    if (plain.includes('}}')) {
      inBlock = false;
      suppress(line);
      return;
    }
    if (NEW_ENTRY_PATTERN.test(plain)) {
      inBlock = false;
      // fall through to print
    } else {
      suppress(line);
      return;
    }
  }

  emit(line);
});

rl.on('close', () => flushPreamble());
