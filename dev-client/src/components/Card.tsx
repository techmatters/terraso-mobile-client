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
import {Pressable} from 'react-native';

import {Box, Row} from 'terraso-mobile-client/components/NativeBaseAdapters';

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
  Header?: React.ReactNode;
  buttons?: React.ReactNode;
  children?: React.ReactNode;
  onPress?: () => void;
  isPopover?: Boolean;
} & React.ComponentProps<typeof Box>;

export const Card = ({
  Header,
  buttons,
  onPress,
  children,
  isPopover = false,
  ...boxProps
}: Props) => (
  <Pressable onPress={onPress}>
    <Box variant="card" marginTop="0px" shadow={undefined} {...boxProps}>
      {isPopover && <CardTriangle />}
      {(Header || buttons) && (
        <Row space="md" alignItems="flex-start" justifyContent="space-between">
          {Header}
          {buttons}
        </Row>
      )}
      {children}
    </Box>
  </Pressable>
);
