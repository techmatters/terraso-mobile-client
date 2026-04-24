#!/usr/bin/env node

/**
 * Pass-through pipeline stage that watches stdin for the "iOS Bundled" line
 * (Metro signaling the JS bundle is ready) and emits an elapsed-time banner
 * right after it. Touches $REBUILD_LAUNCH_MARKER on detection so rebuild_all's
 * EXIT trap can tell "launched" vs "build failed before launch".
 *
 * Runs between the build command and filter-build-logs.js in the pipeline:
 *   <command> | node report-launch-time.js | node filter-build-logs.js
 *
 * Reads from env (set by rebuild_all):
 *   REBUILD_START           unix seconds when rebuild_all started
 *   REBUILD_LAUNCH_MARKER   file path to touch on launch detection
 */

const readline = require('readline');
const fs = require('fs');

const start = Number(process.env.REBUILD_START);
const marker = process.env.REBUILD_LAUNCH_MARKER;
let launched = false;

readline.createInterface({input: process.stdin}).on('line', line => {
  process.stdout.write(line + '\n');
  // Substring match (not anchored) so we still match when Metro's iOS
  // progress bars have accumulated \r-overwrite frames before "iOS Bundled"
  // within the same buffered line coming out of the PTY wrapper.
  if (!launched && /(iOS|Android) Bundled/.test(line)) {
    launched = true;
    const e = Math.floor(Date.now() / 1000) - start;
    const mins = Math.floor(e / 60);
    const ss = String(e % 60).padStart(2, '0');
    process.stdout.write(`\n*** App launched in ${mins}m${ss}s ***\n\n`);
    try { fs.writeFileSync(marker, ''); } catch {}
  }
});
