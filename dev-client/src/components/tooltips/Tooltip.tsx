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

import {IPopoverProps, Popover} from 'native-base';
import {memo} from 'react';

type TooltipProps = React.PropsWithChildren<{
  trigger: IPopoverProps['trigger'];
}>;

export const Tooltip = memo(({trigger, children}: TooltipProps) => {
  return (
    <Popover trigger={trigger}>
      <Popover.Content bg="grey.800" p="0px" shadow="0">
        <Popover.Arrow bg="grey.800" shadow="0" />
        <Popover.Body
          bg="grey.800"
          px="8px"
          py="4px"
          shadow="0"
          _text={{color: 'primary.contrast', fontSize: '16px'}}>
          {children}
        </Popover.Body>
      </Popover.Content>
    </Popover>
  );
});
