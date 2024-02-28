/*
 * Copyright © 2024 Technology Matters
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
import {launchImageLibraryAsync, MediaTypeOptions} from 'expo-image-picker';
import {Photo} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/image';

export const usePickImage = (callback: (result: Photo) => void) =>
  useCallback(async () => {
    const response = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      base64: true,
    });
    if (response.canceled) {
      return;
    }
    const image = response.assets[0];
    if (!image.base64) {
      throw new Error('missing base64 from image picker!');
    }
    callback({...image, base64: image.base64});
  }, [callback]);
