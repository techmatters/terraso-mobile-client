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
  setExperimentalColorScreenEnabled,
  useIsExperimentalColorScreenEnabled,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/experimentalColorScreenToggle';
import {
  setExperimentalCaptureMode,
  useExperimentalCaptureMode,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/experimentalCaptureModeToggle';

// Dev-only three-state cycler: which soil-color capture pipeline runs.
// One tap advances through: Production → RAW + JPEG → RAW + evenness
// (then back to Production). Sync-writes both underlying toggles:
//   Production        → experimentalColorScreen OFF (captureMode ignored)
//   RAW + JPEG        → experimentalColorScreen ON,  captureMode='raw'
//                       (native camera prefers JPEG in 3-stream fallback)
//   RAW + evenness    → experimentalColorScreen ON,  captureMode='raw-live'
//                       (native camera prefers Analysis in 3-stream
//                       fallback, gives live red/green overlay)
type Mode = 'production' | 'raw+jpeg' | 'raw+evenness';

const readMode = (
  experimental: boolean,
  capture: 'jpeg' | 'raw' | 'raw-live',
): Mode => {
  if (!experimental) return 'production';
  if (capture === 'raw-live') return 'raw+evenness';
  return 'raw+jpeg';
};

const applyMode = (m: Mode) => {
  if (m === 'production') {
    setExperimentalColorScreenEnabled(false);
    return;
  }
  setExperimentalColorScreenEnabled(true);
  setExperimentalCaptureMode(m === 'raw+evenness' ? 'raw-live' : 'raw');
};

const nextMode = (m: Mode): Mode =>
  m === 'production'
    ? 'raw+jpeg'
    : m === 'raw+jpeg'
      ? 'raw+evenness'
      : 'production';

const MODE_LABEL: Record<Mode, string> = {
  production: 'Production',
  'raw+jpeg': 'RAW + JPEG',
  'raw+evenness': 'RAW + evenness',
};

export const ExperimentalColorScreenItem = () => {
  const experimental = useIsExperimentalColorScreenEnabled();
  const capture = useExperimentalCaptureMode();
  const mode = readMode(experimental, capture);

  const cycle = useCallback(() => {
    applyMode(nextMode(mode));
  }, [mode]);

  if (APP_CONFIG.environment === 'production') {
    return null;
  }

  return (
    <MenuItem
      variant="default"
      icon="science"
      label={`Color analysis: ${MODE_LABEL[mode]}`}
      onPress={cycle}
    />
  );
};
