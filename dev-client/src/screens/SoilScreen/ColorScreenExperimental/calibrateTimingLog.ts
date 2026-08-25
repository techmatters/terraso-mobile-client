/*
 * Copyright © 2026 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

// Cross-screen timing beacons for the calibrate flow. The pipeline
// spans AndroidRawCaptureScreen → CalibrateReferenceScreen, so a
// module-scoped anchor lets each screen log its milestones against
// the same t=0 (the shutter tap). Turn tracing on/off in one place
// via CALIBRATE_TIMING_ENABLED. Zero cost when disabled.
//
// Sample output for a full shutter-to-results cycle:
//   [calibrate-timing] shutter tap                    +0ms
//   [calibrate-timing] native capturePhoto returned   +612ms  (delta +612ms)
//   [calibrate-timing] nav.pop                        +618ms  (delta +6ms)
//   [calibrate-timing] Calibrate screen mount         +681ms  (delta +63ms)
//   [calibrate-timing] renderPreview start            +682ms  (delta +1ms)
//   [calibrate-timing] renderPreview end              +1704ms (delta +1022ms)
//   [calibrate-timing] seeds set                      +1707ms (delta +3ms)
//   [calibrate-timing] Calibrate & Save tap           +5140ms (delta +3433ms)   ← user
//   [calibrate-timing] decode end                     +5580ms (delta +440ms)
//   [calibrate-timing] rank end                       +5581ms (delta +1ms)
//   [calibrate-timing] pipeline results shown         +5602ms (delta +21ms)

export const CALIBRATE_TIMING_ENABLED = true;

let anchor: number | null = null;
let lastStep: number | null = null;

// Reset the anchor to now (t=0). Called by AndroidRawCaptureScreen's
// shutter on tap. Subsequent logStep() calls report ms since this.
export const startCalibrateTimer = (): void => {
  if (!CALIBRATE_TIMING_ENABLED) return;
  anchor = Date.now();
  lastStep = anchor;
};

// Emit a labelled beacon with both absolute-since-anchor and delta-
// since-last-step timings. No-op if the timer hasn't been started.
export const logCalibrateStep = (label: string): void => {
  if (!CALIBRATE_TIMING_ENABLED) return;
  if (anchor == null) return;
  const now = Date.now();
  const abs = now - anchor;
  const delta = lastStep == null ? 0 : now - lastStep;
  lastStep = now;
  console.log(
    `[calibrate-timing] ${label.padEnd(38, ' ')} +${abs}ms (delta +${delta}ms)`,
  );
};
