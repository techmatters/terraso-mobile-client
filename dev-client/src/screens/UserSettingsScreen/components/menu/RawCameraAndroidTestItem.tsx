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
import {Platform} from 'react-native';

import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

// Phase-7.2 test entry: opens a screen with the native
// RawCameraAndroidView preview + shutter. Android-only, dev-only.
export const RawCameraAndroidTestItem = () => {
  const navigation = useNavigation();

  const onPress = useCallback(() => {
    navigation.navigate('RAW_CAMERA_ANDROID_TEST');
  }, [navigation]);

  if (APP_CONFIG.environment === 'production') {
    return null;
  }
  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <MenuItem
      variant="default"
      icon="camera"
      label="Android RAW test (with preview)"
      onPress={onPress}
    />
  );
};
