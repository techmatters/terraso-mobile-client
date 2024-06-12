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

import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {Image} from 'native-base';

import {User} from 'terraso-client-shared/account/accountSlice';
import {ProjectMembership} from 'terraso-client-shared/project/projectSlice';

import {
  Badge,
  Box,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {formatName} from 'terraso-mobile-client/util';

type InfoProps = {
  membership: ProjectMembership;
  user: User;
  isCurrentUser: boolean;
};

export const UserInfo = ({membership, user, isCurrentUser}: InfoProps) => {
  const {t} = useTranslation();
  const userLabel = useMemo(() => {
    let name = formatName(user.firstName, user.lastName);
    if (isCurrentUser) {
      return t('general.you_name', {name: name});
    } else {
      return name;
    }
  }, [user, isCurrentUser, t]);

  return (
    <Row space={3} justifyContent="space-between" alignItems="center">
      <Box>
        <Image
          variant="profilePic"
          source={{uri: user.profileImage}}
          alt="profile pic"
        />
      </Box>
      <Text flex={3}>{userLabel}</Text>
      <Box>
        <Badge
          variant="chip"
          bg="primary.lighter"
          py="5px"
          px="10px"
          _text={{color: 'text.primary'}}>
          {t(`general.role.${membership.userRole}`)}
        </Badge>
      </Box>
    </Row>
  );
};
