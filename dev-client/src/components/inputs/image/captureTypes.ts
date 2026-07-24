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

import {Photo} from 'terraso-mobile-client/components/inputs/image/ImagePicker';

/**
 * Return type of the raw-or-jpeg capture flow. Phase 2 only emits `'jpeg'`;
 * the `'raw'` case is wired up in phase 4 (see docs/raw-camera-plan.md).
 */
export type CaptureResult =
  | {kind: 'jpeg'; photo: Photo}
  | {
      kind: 'raw';
      dngPath: string;
      width: number;
      height: number;
      decodeRoi(roi: {
        x: number;
        y: number;
        w: number;
        h: number;
      }): Promise<{r: number; g: number; b: number}>;
      dispose(): void;
    };
