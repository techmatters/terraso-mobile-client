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
import {useIsExperimentalRawColorEnabled} from 'terraso-mobile-client/model/rawColor/experimentalRawColorToggle';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

// Dev-only entry to the RAW capture smoke test. Navigates to a dedicated
// full-screen capture screen (RawCaptureTestScreen) rather than presenting an
// in-tree overlay — the latter leaked the opening tap into the shutter. Shown
// only when the experimental RAW-colour flag is on; hidden in production.
export const RawCaptureTestItem = () => {
  const enabled = useIsExperimentalRawColorEnabled();
  const navigation = useNavigation();

  const onPress = useCallback(
    () => navigation.navigate('RAW_CAPTURE_TEST'),
    [navigation],
  );

  if (APP_CONFIG.environment === 'production' || !enabled) {
    return null;
  }

  return (
    <MenuItem
      variant="default"
      icon="photo-camera"
      label="RAW capture (test)"
      onPress={onPress}
    />
  );
};
