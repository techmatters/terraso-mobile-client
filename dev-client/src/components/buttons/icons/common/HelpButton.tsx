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

import {IconButton} from 'terraso-mobile-client/components/buttons/icons/IconButton';
import {Tooltip} from 'terraso-mobile-client/components/tooltips/Tooltip';

type HelpButtonProps = React.PropsWithChildren;

export const HelpButton = ({children}: HelpButtonProps) => (
  <Tooltip trigger={props => <IconButton type="sm" name="help" {...props} />}>
    {children}
  </Tooltip>
);
