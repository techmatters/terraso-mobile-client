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

import {Image} from 'native-base';

import {User} from 'terraso-client-shared/account/accountSlice';

import {
  HStack,
  Text,
  VStack,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {formatName} from 'terraso-mobile-client/util';

export type UserFields = Omit<User, 'preferences'>;

type DisplayProps = {
  user: UserFields;
};

export const MinimalUserDisplay = ({
  user: {profileImage, firstName, lastName, email},
}: DisplayProps) => {
  const {t} = useTranslation();

  return (
    <VStack>
      <HStack>
        <Image
          variant="profilePic"
          source={{uri: profileImage}}
          alt={t('general.profile_image_alt')}
        />

        <VStack ml="32px">
          <Text variant="body1-strong">{formatName(firstName, lastName)}</Text>
          <Text variant="body1">{email}</Text>
        </VStack>
      </HStack>
    </VStack>
  );
};
