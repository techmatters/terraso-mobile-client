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

import {PressableProps, StyleSheet} from 'react-native';
import {Surface} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {IconName} from 'terraso-mobile-client/components/icons/Icon';

type Positioning = 'BottomRight' | 'BottomCenter';

export type FabProps = {
  label: string;
  leftIcon?: IconName;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
  positioning?: Positioning;
};

export const Fab = ({
  label,
  leftIcon,
  disabled,
  onPress,
  positioning = 'BottomRight',
}: FabProps) => {
  const {bottom} = useSafeAreaInsets();
  const surfacePositionStyle =
    positioning === 'BottomCenter'
      ? styles.surfaceBottomCenter
      : styles.surfaceBottomRight;

  // Only apply extra spacing for Android soft buttons (typically >40px)
  // iOS home indicator (34px) should keep default 16px margin
  const bottomPosition = bottom > 40 ? bottom : 16;

  return (
    <Surface
      style={[styles.surface, surfacePositionStyle, {bottom: bottomPosition}]}
      elevation={2}>
      <ContainedButton
        label={label}
        leftIcon={leftIcon}
        disabled={disabled}
        size="lg"
        onPress={onPress}
      />
    </Surface>
  );
};

const styles = StyleSheet.create({
  surface: {
    position: 'absolute',
    margin: 16,
    backgroundColor: 'transparent',
    borderRadius: 4,
  },
  surfaceBottomRight: {
    right: 0,
  },
  surfaceBottomCenter: {
    alignSelf: 'center',
  },
});
