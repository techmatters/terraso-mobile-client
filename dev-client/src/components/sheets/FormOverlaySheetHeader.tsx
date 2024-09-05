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

import {useTranslation} from 'react-i18next';
import {Pressable, StyleSheet} from 'react-native';

import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

type FormOverlaySheetHeaderProps = {
  onDone?: () => void;
};

export const FormOverlaySheetHeader = ({
  onDone,
}: FormOverlaySheetHeaderProps) => {
  const {t} = useTranslation();

  return (
    <Pressable
      onPress={onDone}
      accessibilityRole="button"
      accessibilityLabel={t('general.done')}
      style={styles.header}>
      <Text
        variant="body1-strong"
        color="primary.contrast"
        textTransform="uppercase">
        {t('general.done')}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: convertColorProp('primary.main'),
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
