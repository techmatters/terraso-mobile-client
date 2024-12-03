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

import {PressableProps, StyleSheet, Text} from 'react-native';

import {Button} from 'native-base';

import {TranslatedContent} from 'terraso-mobile-client/components/content/typography/TranslatedContent';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type DismissButtonProps = {
  onPress?: PressableProps['onPress'];
};

export const DismissButton = ({onPress}: DismissButtonProps) => {
  return (
    <Button
      borderColor="alert.errorContent"
      _pressed={{backgroundColor: 'transparent'}}
      onPress={onPress}
      variant="outline">
      <Text style={styles.text}>
        <TranslatedContent i18nKey="general.dismiss" />
      </Text>
    </Button>
  );
};

const styles = StyleSheet.create({
  text: {
    color: convertColorProp('alert.errorContent'),
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '500',
  },
});
