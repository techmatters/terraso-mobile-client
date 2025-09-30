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
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

export type CreateSiteHereButtonProps = {
  disabled?: boolean;
  coords: Coords;
  elevation?: number;
  afterCreate?: () => void;
};

export const CreateSiteHereButton = ({
  disabled,
  coords,
  elevation,
  afterCreate: cleanUp,
}: CreateSiteHereButtonProps) => {
  const {t} = useTranslation();

  const navigation = useNavigation();
  const onCreate = useCallback(() => {
    navigation.navigate('CREATE_SITE', {
      coords,
      elevation: elevation,
    });
    if (cleanUp) {
      cleanUp();
    }
  }, [cleanUp, navigation, coords, elevation]);

  return (
    <ContainedButton
      label={t('site.create.button_label')}
      leftIcon="add"
      disabled={disabled}
      onPress={onCreate}
    />
  );
};
