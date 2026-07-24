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

import {useCameraDevice} from 'react-native-vision-camera';

/**
 * Reports whether the current device can offer a back-facing camera at all,
 * and (once phase 4 wires it up) whether that camera supports plain-Bayer DNG
 * capture.
 *
 * Vision-camera v5 doesn't yet expose `supportedPhotoContainerFormats` — the
 * source has an explicit TODO. Until it does, the actual DNG-capable check
 * happens at capture time (see `RawCameraView`). This hook only answers the
 * cheap up-front question: "is there any usable camera at all?".
 */
export function useRawOrJpegCapture(): {
  hasCamera: boolean;
  /**
   * `true` if the device *might* be able to shoot RAW. Phase 2 always
   * returns `false` — the RAW path lands in phase 4. See
   * docs/raw-camera-plan.md.
   */
  isRawAvailable: boolean;
} {
  const backCamera = useCameraDevice('back');
  return {
    hasCamera: backCamera !== undefined,
    isRawAvailable: false,
  };
}
