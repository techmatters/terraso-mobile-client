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

import {Pressable} from 'react-native';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  ImagePicker,
  Photo,
} from 'terraso-mobile-client/components/inputs/image/ImagePicker';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = {
  featureName: string;
  onPick: (photo: Photo) => void;
};

export const PickImageButton = ({featureName, onPick}: Props) => {
  return (
    <ImagePicker featureName={featureName} onPick={onPick}>
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
            <Icon name="add-photo-alternate" color="action.active" size="lg" />
          </Box>
        </Pressable>
      )}
    </ImagePicker>
  );
};
