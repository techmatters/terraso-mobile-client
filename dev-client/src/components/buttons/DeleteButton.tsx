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

import {useTranslation} from 'react-i18next';

import {Button} from 'native-base';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';

type Props = {
  label?: string;
} & React.ComponentProps<typeof Button>;

export default function DeleteButton({label, ...props}: Props) {
  const {t} = useTranslation();

  label = label ?? t('general.delete_fab');

  return (
    <Button
      background="background.default"
      p={0}
      pt="10px"
      variant="error"
      startIcon={
        <Icon
          name="delete"
          color={props?.disabled ? 'action.disabled' : 'error.main'}
          size="md"
          mr={2}
        />
      }
      isDisabled={props?.disabled ? props.disabled : undefined}
      _text={{
        fontWeight: 500,
        fontSize: 'md',
        textTransform: 'uppercase',
      }}
      {...props}>
      {label}
    </Button>
  );
}
