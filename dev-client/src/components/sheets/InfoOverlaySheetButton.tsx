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

import {InfoButton} from 'terraso-mobile-client/components/buttons/InfoButton';
import {InfoOverlaySheet} from 'terraso-mobile-client/components/sheets/InfoOverlaySheet';

type Props = {
  Header: React.ReactNode;
};

export const InfoOverlaySheetButton = ({
  Header,
  children,
}: React.PropsWithChildren<Props>) => (
  <InfoOverlaySheet
    trigger={onOpen => <InfoButton onPress={onOpen} />}
    Header={Header}>
    {children}
  </InfoOverlaySheet>
);
