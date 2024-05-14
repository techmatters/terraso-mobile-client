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
import {Button} from 'native-base';

import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {Coords} from 'terraso-client-shared/types';

type Props = {coords: Coords};

export const CreateSiteButton = ({coords}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onCreate = useCallback(() => {
    navigation.navigate('CREATE_SITE', {coords});
  }, [navigation, coords]);

  return (
    <Button
      alignSelf="center"
      onPress={onCreate}
      leftIcon={<Icon name="add" />}
      _text={{textTransform: 'uppercase'}}>
      {t('site.create.button_label')}
    </Button>
  );
};
