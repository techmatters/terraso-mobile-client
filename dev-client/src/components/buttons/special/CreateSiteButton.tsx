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

import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';

import {Coords} from 'terraso-client-shared/types';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {OutlinedButton} from 'terraso-mobile-client/components/buttons/OutlinedButton';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

export type CreateSiteButtonProps = {
  disabled?: boolean;
  coords: Coords;
  elevation?: number;
  afterCreate?: () => void;
  creationMethod: 'map' | 'address';
  label?: string;
  variant?: 'contained' | 'outlined';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export const CreateSiteButton = ({
  disabled,
  coords,
  elevation,
  afterCreate: cleanUp,
  creationMethod,
  label,
  variant = 'outlined',
  showIcon = false,
  size,
}: CreateSiteButtonProps) => {
  const {t} = useTranslation();

  const navigation = useNavigation();
  const onCreate = useCallback(() => {
    navigation.navigate('CREATE_SITE', {
      coords,
      elevation: elevation,
      creationMethod,
    });
    if (cleanUp) {
      cleanUp();
    }
  }, [cleanUp, navigation, coords, elevation, creationMethod]);

  const buttonLabel = label || t('site.create.title');
  const icon = showIcon ? 'add' : undefined;

  if (variant === 'outlined') {
    return (
      <OutlinedButton
        label={buttonLabel}
        disabled={disabled}
        onPress={onCreate}
      />
    );
  }

  return (
    <ContainedButton
      label={buttonLabel}
      leftIcon={icon}
      disabled={disabled}
      onPress={onCreate}
      size={size}
    />
  );
};
