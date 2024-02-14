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
