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

import type {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import type {ChartGuide} from 'terraso-mobile-client/screens/MunsellChartValidator/chartGuide';

// Module-scope bridge for the Android RAW capture flow. The
// RawCameraView JS wrapper stashes onCapture / onCancel callbacks here,
// then navigates to ANDROID_RAW_CAPTURE. The screen picks them up on
// mount. Same pattern as rawAnalysisSession — necessary because
// React Navigation params should be JSON-serializable and callbacks
// aren't. Only one flow can be active at a time (matches the UX: you
// can't open two cameras concurrently).

export type AndroidRawCaptureCallbacks = {
  onCapture: (result: CaptureResult) => void;
  onCancel: () => void;
  // Optional chart-guide overlay — set by the RawCameraView wrapper
  // when the parent passed `chartGuide`. Same aspectW / aspectH /
  // marginFrac shape iOS's Vision Camera path consumes.
  chartGuide?: ChartGuide;
  // When true, the capture screen shows the research controls (MULTI
  // button, Burst toggle, Manual iso/shutter, EV widget). Only the
  // Munsell chart validator flow wants them. Calibrate / fixture
  // flows set this false (or omit) and get a clean single-shot UI.
  showResearchControls?: boolean;
  // Optional on-screen banner text shown above the shutter — use to
  // remind the user what they're supposed to frame (e.g. calibration
  // wants both cards in the shot, which isn't obvious from the
  // camera view alone).
  captureHint?: string;
  // Optional label text for the two ROI overlay rectangles. When set,
  // the capture screen enables size-cycling +/- buttons and paints
  // these labels above the native RoiOverlayView rectangles. Actual
  // ROI positions come from the shared ROI_PRESETS (getActiveRoiPreset)
  // so both the native rectangles AND the JS label pills stay in sync
  // with the +/- buttons. Calibrate flow sets ['EXISTING REF',
  // 'NEW REF']; leave undefined for flows that don't want labels (soil
  // color RAW-Live etc.).
  roiHint?: {
    labels: readonly [string, string];
  };
  // When true, request skipJpeg on the RAW capture — noticeably faster
  // on Android because it drops the second takePicture from the
  // critical path. Chart flow keeps this false (JPEG needed for the
  // JPEG-pipeline A/B); calibrate/fixture set true.
  skipJpeg?: boolean;
  // When true, camera bind's 3-stream fallback keeps JPEG and drops
  // ImageAnalysis. Chart flow + soil-color 'raw+jpeg' mode set this
  // true. Calibrate + 'raw+evenness' leave undefined (=false) so
  // the live variance analyser stays alive on constrained devices.
  preferJpeg?: boolean;
};

let pending: AndroidRawCaptureCallbacks | null = null;

export const setAndroidRawCaptureCallbacks = (
  callbacks: AndroidRawCaptureCallbacks,
): void => {
  pending = callbacks;
};

export const consumeAndroidRawCaptureCallbacks =
  (): AndroidRawCaptureCallbacks | null => {
    const cb = pending;
    pending = null;
    return cb;
  };
