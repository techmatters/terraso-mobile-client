/*
 * Copyright © 2026 Technology Matters
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

import {BaseButton} from 'terraso-mobile-client/components/buttons/BaseButton';
import {IconName} from 'terraso-mobile-client/components/icons/Icon';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type PillButtonProps = {
  label: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
};

/*
 * Low-emphasis rounded button for sentence-case prose labels ("How does it work?"),
 * as opposed to the uppercase action verbs the contained and outlined buttons carry.
 */
export const PillButton = ({
  label,
  leftIcon,
  rightIcon,
  disabled,
  onPress,
}: PillButtonProps) => {
  return (
    <BaseButton
      label={label}
      shape="pill"
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      containerStyles={CONTAINER_STYLES}
      contentStyles={CONTENT_STYLES}
      disabled={disabled}
      onPress={onPress}
    />
  );
};

const styles = StyleSheet.create({
  containerDefault: {
    backgroundColor: convertColorProp('info.background'),
    borderColor: convertColorProp('info.background'),
  },
  containerDefaultPressed: {
    /* Darkened info.background; no theme token exists for it yet. */
    backgroundColor: '#CCE8F6',
    borderColor: '#CCE8F6',
  },
  containerDisabled: {
    backgroundColor: convertColorProp('action.disabledBackground'),
    borderColor: convertColorProp('action.disabledBackground'),
  },
  contentDefault: {
    color: convertColorProp('info.content'),
  },
  contentDisabled: {
    color: convertColorProp('action.disabled'),
  },
});

const CONTAINER_STYLES = {
  default: styles.containerDefault,
  pressed: styles.containerDefaultPressed,
  disabled: styles.containerDisabled,
};

const CONTENT_STYLES = {
  default: styles.contentDefault,
  disabled: styles.contentDisabled,
};
