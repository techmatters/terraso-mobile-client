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
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

// Dev-only menu row: opens ManageCustomReferencesScreen where the
// tester can review + delete calibrated custom references saved via
// CalibrateReferenceItem. See phase 6 in docs/raw-camera-plan.md.
export const ManageCustomReferencesItem = () => {
  const navigation = useNavigation();

  const onPress = useCallback(() => {
    navigation.navigate('MANAGE_CUSTOM_REFERENCES_EXPERIMENTAL');
  }, [navigation]);

  if (APP_CONFIG.environment === 'production') {
    return null;
  }

  return (
    <MenuItem
      variant="default"
      icon="list"
      label="Manage custom references (dev)"
      onPress={onPress}
    />
  );
};
