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

import {useTranslation} from 'react-i18next';
import {PressableProps, StyleSheet, Text} from 'react-native';
import {TouchableRipple} from 'react-native-paper';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type AddSoilDepthButtonProps = {
  onPress: PressableProps['onPress'];
};

export const AddSoilDepthButton = ({onPress}: AddSoilDepthButtonProps) => {
  const {t} = useTranslation();
  const label = t('soil.add_depth_label');

  return (
    <TouchableRipple
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress ?? undefined}
      style={styles.container}>
      <>
        <Icon style={[styles.content, styles.icon]} name="add" />
        <Text style={[styles.content, styles.label]}>{label}</Text>
      </>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: convertColorProp('primary.dark'),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 22,
  },
  content: {
    color: convertColorProp('primary.contrast'),
  },
  label: {
    fontWeight: '500',
    textTransform: 'uppercase',
    fontSize: 15,
    lineHeight: 26,
  },
  icon: {
    marginRight: 8,
  },
});
