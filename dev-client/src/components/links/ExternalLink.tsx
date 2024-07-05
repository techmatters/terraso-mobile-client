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

import React, {useCallback, useMemo} from 'react';
import {Linking, Pressable, StyleSheet, View} from 'react-native';

import {IconButton as NativeIconButton} from 'native-base';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  Box,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {validateUrl} from 'terraso-mobile-client/util';

export type ExternalLinkProps = {
  label: string;
  url: string;
};

export const ExternalLink = React.forwardRef(
  ({label, url}: ExternalLinkProps, ref: React.Ref<unknown>) => {
    const isValidUrl = useMemo(() => validateUrl(url), [url]);
    const openUrl = useCallback(() => Linking.openURL(url), [url]);

    return (
      isValidUrl && (
        <View style={styles.container}>
          <Pressable onPress={openUrl}>
            <Box>
              <Row alignItems="center">
                <Text
                  color="primary.main"
                  fontSize="md"
                  textTransform="uppercase"
                  style={styles.label}>
                  {label}
                </Text>
                <NativeIconButton
                  ref={ref}
                  icon={<Icon name="open-in-new" />}
                />
              </Row>
            </Box>
          </Pressable>
        </View>
      )
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
