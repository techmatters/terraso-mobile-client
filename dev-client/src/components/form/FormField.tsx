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

import {FormControl} from 'native-base';
import {memo} from 'react';
import {
  FieldContext,
  useFieldContext,
} from 'terraso-mobile-client/components/form/hooks/useFieldContext';

type Props<Name extends string> = React.PropsWithChildren<{
  name: Name;
}>;

export const FormField = memo(
  <Name extends string>({name, children}: Props<Name>) => (
    <FieldContext.Provider value={useFieldContext(name)}>
      <FormControl>{children}</FormControl>
    </FieldContext.Provider>
  ),
);
