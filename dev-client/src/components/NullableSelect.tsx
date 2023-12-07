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

import {Select} from 'native-base';
import {useCallback} from 'react';

type Props = {
  nullableOption: string;
  onValueChange: (newValue: string | undefined) => void;
} & Omit<React.ComponentProps<typeof Select>, 'onValueChange'> &
  React.PropsWithChildren;

export const NullableSelect = ({
  nullableOption,
  children,
  onValueChange,
  ...selectProps
}: Props) => {
  const changeWrapper = useCallback(
    (newValue: string) => {
      newValue === '' ? onValueChange(undefined) : onValueChange(newValue);
    },
    [onValueChange],
  );

  return (
    <Select {...selectProps} onValueChange={changeWrapper}>
      <Select.Item value="" label={nullableOption} />
      {children}
    </Select>
  );
};
