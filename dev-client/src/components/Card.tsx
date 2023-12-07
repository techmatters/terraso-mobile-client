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

import {Box} from 'native-base';
import {Pressable} from 'react-native';

const TRIANGLE_BORDER_WIDTH = 15;

const CardTriangle = () => {
  return (
    <Box
      width={0}
      height={0}
      borderBottomWidth={TRIANGLE_BORDER_WIDTH}
      borderBottomColor="white"
      borderLeftWidth={TRIANGLE_BORDER_WIDTH}
      borderLeftColor="transparent"
      borderRightWidth={TRIANGLE_BORDER_WIDTH}
      borderRightColor="transparent"
      alignSelf="center"
      position="absolute"
      top={-14}
    />
  );
};

type Props = {
  buttons?: React.ReactNode;
  children?: React.ReactNode;
  onPress?: () => void;
  isPopover?: Boolean;
} & React.ComponentProps<typeof Box>;

export const Card = ({
  buttons,
  onPress,
  children,
  isPopover = false,
  ...boxProps
}: Props) => {
  return (
    <Pressable onPress={onPress}>
      <Box
        variant="card"
        marginTop={isPopover ? '15px' : '0px'}
        shadow={isPopover ? 9 : undefined}
        {...boxProps}>
        {isPopover && <CardTriangle />}
        {children}
        {buttons}
      </Box>
    </Pressable>
  );
};
