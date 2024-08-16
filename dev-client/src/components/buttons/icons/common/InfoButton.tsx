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
import {InfoSheet} from 'terraso-mobile-client/components/sheets/InfoSheet';

type InfoButtonProps = React.PropsWithChildren<{
  sheetHeading?: React.ReactNode;
}>;

export const InfoButton = ({
  sheetHeading,
  children,
}: React.PropsWithChildren<InfoButtonProps>) => (
  <InfoSheet
    trigger={onOpen => <IconButton type="sm" name="info" onPress={onOpen} />}
    heading={sheetHeading}>
    {children}
  </InfoSheet>
);
