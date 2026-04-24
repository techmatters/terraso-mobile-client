#!/usr/bin/env node

/**
 * Runs a command inside a real PTY (via node-pty) and emits its output as
 * clean \n-terminated lines to stdout. Forwards our own stdin (in raw mode)
 * to the PTY so interactive keyboard shortcuts reach the child.
 *
 * Exists so expo's stdout.isTTY check passes — which it needs for keyboard
 * shortcuts (r, m, j, shift+m, etc.) to work — while still letting us pipe
 * the output through filter-build-logs.js and report-launch-time.js downstream.
 *
 * Usage: node run-expo-pty.js <cmd> [args...]
 *   e.g.: node run-expo-pty.js npm run ios
 *         node run-expo-pty.js npm run ios -- --device <id>
 */

// node-pty ships prebuilt natives, but npm sometimes doesn't set the exec bit
// on the bundled spawn-helper (seen on macOS arm64 + Node 25). Fix it up
// before loading the module so we don't get a cryptic "posix_spawnp failed".
(function ensureSpawnHelperExecutable() {
  const path = require('path');
  const fs = require('fs');
  const prebuildDir = path.join(
    __dirname,
    '..',
    'node_modules',
    'node-pty',
    'prebuilds',
    `${process.platform}-${process.arch}`,
  );
  const helper = path.join(prebuildDir, 'spawn-helper');
  try {
    if (fs.existsSync(helper)) {
      fs.chmodSync(helper, 0o755);
    }
  } catch {
    // Best effort; if this fails node-pty will error with its own message.
  }
})();

const pty = require('node-pty');

const [cmd, ...cmdArgs] = process.argv.slice(2);

if (!cmd) {
  console.error('Usage: run-expo-pty.js <cmd> [args...]');
  process.exit(2);
}

// Terminal dims: stdout is a pipe in the rebuild_all pipeline, so ask stderr
// (inherited from parent → terminal). Fall back if neither is a TTY.
const getDims = () => ({
  cols: process.stderr.columns || 80,
  rows: process.stderr.rows || 24,
});

const {cols, rows} = getDims();

const term = pty.spawn(cmd, cmdArgs, {
  name: process.env.TERM || 'xterm-256color',
  cols,
  rows,
  cwd: process.cwd(),
  env: process.env,
});

// Line-buffer PTY output on \n only. Embedded \r characters (Metro's iOS
// progress bars use bare \r to overwrite in place) are preserved inside the
// line — the terminal at the end of the pipe interprets them as "cursor to
// col 0" so progress bars render correctly as in-place overwrites.
// Downstream scanners (report-launch-time.js) match substrings rather than
// anchored line starts, so they still see "iOS Bundled" inside the line
// even when it's preceded by accumulated progress frames.
let buffer = '';
term.onData(chunk => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    let line = buffer.slice(0, idx);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    buffer = buffer.slice(idx + 1);
    process.stdout.write(line + '\n');
  }
});

// Forward our stdin to the PTY so keyboard shortcuts work. Raw mode so
// individual keystrokes go through unbuffered (no line-editing layer).
let stdinRawSet = false;
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  stdinRawSet = true;
  process.stdin.on('data', data => term.write(data.toString()));
}

// On resize, tell the PTY so expo/metro redraw at the right width.
process.stderr.on('resize', () => {
  const {cols, rows} = getDims();
  term.resize(cols, rows);
});

// Forward signals to the child. Ctrl+C in our terminal should stop expo
// cleanly rather than leave detached process groups behind.
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    try { term.kill(sig); } catch {}
  });
}

// Restore stdin state on any exit path to avoid leaving the terminal in
// raw mode (which would manifest as "typed keys don't echo" in the shell
// after rebuild_all returns).
const restoreStdin = () => {
  if (stdinRawSet && process.stdin.isTTY) {
    try { process.stdin.setRawMode(false); } catch {}
  }
};
process.on('exit', restoreStdin);

term.onExit(({exitCode, signal}) => {
  // Flush any remaining buffered partial line.
  if (buffer.length > 0) {
    process.stdout.write(buffer);
    buffer = '';
  }
  restoreStdin();
  // If child was killed by a signal, exit with conventional 128 + signum.
  // node-pty's signal is a number; map SIGINT (2) → 130, SIGTERM (15) → 143.
  process.exit(exitCode != null ? exitCode : (128 + (signal || 0)));
});
