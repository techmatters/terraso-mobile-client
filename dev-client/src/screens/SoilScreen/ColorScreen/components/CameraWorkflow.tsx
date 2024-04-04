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

import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {
  Box,
  Column,
  Paragraph,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useTranslation} from 'react-i18next';
import {Button} from 'native-base';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {Pressable} from 'react-native';
import {useCallback} from 'react';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ImagePicker, Photo} from 'terraso-mobile-client/components/ImagePicker';

export const CameraWorkflow = (props: SoilPitInputScreenProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onPickImage = useCallback(
    (photo: Photo) => {
      navigation.navigate('COLOR_ANALYSIS', {
        photo: photo,
        pitProps: props,
      });
    },
    [navigation, props],
  );

  const onUseGuide = useCallback(
    () => navigation.navigate('COLOR_GUIDE', props),
    [props, navigation],
  );

  return (
    <Column>
      <Box alignItems="center" paddingVertical="lg">
        <ImagePicker onPick={onPickImage}>
          {onOpen => (
            <Pressable onPress={onOpen}>
              <Box
                borderRadius="24px"
                width="180px"
                height="180px"
                justifyContent="center"
                alignItems="center"
                borderStyle="dashed"
                borderWidth="2px"
                borderColor="grey.700">
                <Icon
                  name="add-photo-alternate"
                  color="action.active"
                  size="lg"
                />
              </Box>
            </Pressable>
          )}
        </ImagePicker>
      </Box>
      <Column
        backgroundColor="grey.300"
        paddingHorizontal="md"
        paddingVertical="lg"
        alignItems="flex-start">
        <Paragraph>{t('soil.color.photo_need_help')}</Paragraph>
        <Button
          _text={{textTransform: 'uppercase'}}
          onPress={onUseGuide}
          rightIcon={<Icon name="chevron-right" />}>
          {t('soil.color.use_guide_label')}
        </Button>
      </Column>
    </Column>
  );
};
