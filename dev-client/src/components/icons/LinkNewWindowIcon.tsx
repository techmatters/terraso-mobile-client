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

import {IconButton as NativeIconButton} from 'native-base';
import React from 'react';
import {Linking, Pressable, StyleSheet, View} from 'react-native';
import {
  Box,
  HStack,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';

export type LinkNewWindowIconProps = React.ComponentProps<
  typeof NativeIconButton
> & {
  label: string;
  url: string;
};

export const LinkNewWindowIcon = React.forwardRef(
  ({label, url, ...props}: LinkNewWindowIconProps, ref: React.Ref<unknown>) => {
    const icon = (
      <NativeIconButton
        ref={ref}
        icon={<Icon name={'open-in-new'} />}
        {...props}
      />
    );

    return (
      <View style={styles.container}>
        <Pressable onPress={() => Linking.openURL(url)}>
          <Box>
            <HStack>
              <Text
                color={'primary.main'}
                fontSize="md"
                textTransform={'uppercase'}
                style={styles.label}>
                {label}
              </Text>
              {icon}
            </HStack>
          </Box>
        </Pressable>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  label: {
    marginRight: 4,
    verticalAlign: 'middle',
  },
});
