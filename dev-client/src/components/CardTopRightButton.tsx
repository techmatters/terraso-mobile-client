/*
 * Copyright © 2023 Technology Matters
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
import {IconButton} from 'terraso-mobile-client/components/Icons';
import {Pressable} from 'react-native';
import {forwardRef} from 'react';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = React.ComponentProps<typeof IconButton> & {
  _box?: React.ComponentProps<typeof Box>;
};

export const CardTopRightButton = forwardRef(
  ({_box = {}, ...props}: Props, ref) => {
    return (
      <Box position="absolute" top="8px" right="8px" p="8px" {..._box}>
        <Pressable onPress={props.onPress}>
          <IconButton ref={ref} {...props} />
        </Pressable>
      </Box>
    );
  },
);
