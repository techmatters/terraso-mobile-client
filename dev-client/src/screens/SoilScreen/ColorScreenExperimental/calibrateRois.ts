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

// Label text for the calibrate flow's two on-camera ROI hint pills,
// in (top, bottom) order — matches ROI_PRESETS' ref/sample order.
// Actual rectangle positions come from ROI_PRESETS (see
// useRoiFrameAnalyzer.ts) so the +/- size buttons on the capture
// screen cycle both the visible box AND the label together.
export const CALIBRATE_LABELS = ['EXISTING REF', 'NEW REF'] as const;
