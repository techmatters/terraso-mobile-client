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

/** Which capture pipeline the in-app camera should use. */
export type CaptureMode = 'raw' | 'jpeg';

export type CaptureStrategyInput = {
  /** The experimental RAW-colour feature flag. */
  flagEnabled: boolean;
  /** Device/OS RAW capability (native-detected; false until wired). */
  rawSupported: boolean;
  /**
   * Explicit fall back to JPEG even on a capable device — dev override, or a
   * capture flow (share/calibrate) that wants JPEG regardless.
   */
  forceJpeg?: boolean;
};

/**
 * Decide the capture mode. Fallback-first: RAW is only chosen when the feature
 * is on, the device supports it, and nothing forces JPEG — otherwise we use the
 * existing JPEG path so a capture never fails for lack of RAW support.
 *
 * Pure so it is unit-tested here; the `rawSupported` input comes from native
 * capability detection wired in a later slice.
 */
export const decideCaptureMode = ({
  flagEnabled,
  rawSupported,
  forceJpeg = false,
}: CaptureStrategyInput): CaptureMode => {
  if (!flagEnabled) {
    return 'jpeg';
  }
  if (forceJpeg) {
    return 'jpeg';
  }
  return rawSupported ? 'raw' : 'jpeg';
};
