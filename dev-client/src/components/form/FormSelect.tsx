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

import {Select as NativeSelect} from 'native-base';
import {Icon} from 'terraso-mobile-client/components/Icons';

export type Props<T extends string> = {
  options: Record<T, string>;
  selectedValue: T | undefined;
  onValueChange: (value: T) => void;
} & Omit<
  React.ComponentProps<typeof NativeSelect>,
  'selectedValue' | 'onValueChange'
>;

export const FormSelect = <T extends string>({
  options,
  onValueChange,
  ...props
}: Props<T>) => {
  return (
    <NativeSelect
      dropdownIcon={<Icon name="arrow-drop-down" />}
      onValueChange={onValueChange as (value: string) => void}
      {...props}>
      {Object.entries<string>(options).map(([value, label]) => (
        <NativeSelect.Item key={value} label={label} value={value} />
      ))}
    </NativeSelect>
  );
};
