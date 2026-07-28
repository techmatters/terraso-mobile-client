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
