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

import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';

import {AppBarIconButton} from 'terraso-mobile-client/components/buttons/icons/appBar/AppBarIconButton';
import {IconName} from 'terraso-mobile-client/components/icons/Icon';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

type Props = {icon?: IconName; testID?: string};

export const ScreenBackButton = ({icon = 'arrow-back', testID}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const goBack = useCallback(() => navigation.pop(), [navigation]);

  return (
    <AppBarIconButton
      name={icon}
      accessibilityLabel={
        icon === 'close' ? t('general.close') : t('general.back')
      }
      testID={testID}
      onPress={goBack}
    />
  );
};
