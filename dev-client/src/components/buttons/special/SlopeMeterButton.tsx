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
import {PressableProps} from 'react-native';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';

export type SlopeMeterButtonProps = {
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
};

export const SlopeMeterButton = ({
  disabled,
  onPress,
}: SlopeMeterButtonProps) => {
  const {t} = useTranslation();
  return (
    <ContainedButton
      label={t('general.use')}
      leftIcon="check"
      disabled={disabled}
      size="xl"
      onPress={onPress}
    />
  );
};
