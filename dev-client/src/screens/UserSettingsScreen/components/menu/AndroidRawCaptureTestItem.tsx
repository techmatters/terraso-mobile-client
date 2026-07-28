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

import {setAndroidRawCaptureCallbacks} from 'terraso-mobile-client/components/inputs/image/androidRawCaptureRequest';
import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

// Phase-7.3 diagnostic: opens ANDROID_RAW_CAPTURE with dummy callbacks,
// bypassing the color-analysis flow entirely. If this works but the
// color-flow entry fails, something in the color-flow parent tree is
// putting the camera pipeline in a bad state. If both fail, the screen
// or session manager themselves are broken.
export const AndroidRawCaptureTestItem = () => {
  const navigation = useNavigation();

  const onPress = useCallback(() => {
    setAndroidRawCaptureCallbacks({
      onCapture: result => {
        console.log(
          'AndroidRawCaptureTestItem: got result',
          result.kind,
          result.kind === 'raw' ? result.dngPath : '',
        );
      },
      onCancel: () => {
        console.log('AndroidRawCaptureTestItem: cancelled');
      },
    });
    navigation.navigate('ANDROID_RAW_CAPTURE');
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
      label="Android RAW capture screen (dev direct)"
      onPress={onPress}
    />
  );
};
