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

import {Link} from 'native-base';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {ThemeColor} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

type Props = {
  children?: React.ReactNode;
  iconName: string;
  underlined?: boolean;
  color?: ThemeColor;
} & React.ComponentProps<typeof Link>;

// TODO: There is going to be (at least) two different types of IconLinks
// Let's use this one for now
export default function IconLink({
  children,
  iconName,
  underlined,
  color = 'primary.main',
  ...props
}: Props) {
  return (
    <Link
      _text={{color, fontSize: 'xs', textTransform: 'uppercase'}}
      alignItems="center"
      alignContent="flex-start"
      isUnderlined={underlined}
      {...props}>
      <Icon name={iconName} color={color} size="md" mr={3} />
      {children}
    </Link>
  );
}
