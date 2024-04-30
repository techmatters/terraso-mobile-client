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
import {ImagePicker, Photo} from 'terraso-mobile-client/components/ImagePicker';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';

type Props = {
  onPick: (photo: Photo) => void;
};

export const PickImageButton = ({onPick}: Props) => {
  return (
    <ImagePicker onPick={onPick}>
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
