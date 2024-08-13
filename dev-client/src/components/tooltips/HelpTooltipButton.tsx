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

import {memo} from 'react';

import {HelpButton} from 'terraso-mobile-client/components/buttons/icons/HelpButton';
import {Tooltip} from 'terraso-mobile-client/components/tooltips/Tooltip';

type Props = React.PropsWithChildren;

export const HelpTooltipButton = memo(({children}: Props) => {
  return (
    <Tooltip trigger={props => <HelpButton {...props} />}>{children}</Tooltip>
  );
});
