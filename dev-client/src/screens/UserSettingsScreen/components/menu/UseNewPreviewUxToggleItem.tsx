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

import {useCallback} from 'react';

import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {
  setUseNewPreviewUx,
  useUseNewPreviewUx,
} from 'terraso-mobile-client/model/rawColor/colorCameraPrefs';

// Dev-only switch: when ON, soil-colour capture flows use the new
// live-preview + ROI-analyzer UX (shared with the RAW capture test screen)
// instead of the existing pick-image-then-crop flow. Applies to both the RAW
// and non-RAW pipelines. Hidden in production builds.
export const UseNewPreviewUxToggleItem = () => {
  const enabled = useUseNewPreviewUx();
  const onPress = useCallback(() => setUseNewPreviewUx(!enabled), [enabled]);
  if (APP_CONFIG.environment === 'production') {
    return null;
  }
  return (
    <MenuItem
      variant="default"
      icon="photo-camera"
      label={`Use new Preview UX: ${enabled ? 'ON' : 'OFF'}`}
      onPress={onPress}
    />
  );
};
