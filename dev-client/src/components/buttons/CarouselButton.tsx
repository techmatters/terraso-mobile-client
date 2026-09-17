/*
 * Copyright © 2026 Technology Matters
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

import {PillButton} from 'terraso-mobile-client/components/buttons/PillButton';
import {CarouselPage} from 'terraso-mobile-client/components/Carousel';
import {CarouselSheet} from 'terraso-mobile-client/components/sheets/CarouselSheet';

export type CarouselButtonProps = {
  label: string;
  pages: CarouselPage[];
  sheetHeading?: React.ReactNode;
  /* Fires alongside opening the sheet, for callers tracking whether the carousel has been viewed. */
  onPress?: () => void;
};

/*
 * Pill trigger that opens a CarouselSheet. The label doubles as the accessibility
 * name, so unlike an image trigger there is nothing extra for callers to supply.
 */
export const CarouselButton = ({
  label,
  pages,
  sheetHeading,
  onPress,
}: CarouselButtonProps) => (
  <CarouselSheet
    pages={pages}
    heading={sheetHeading}
    trigger={onOpen => (
      <PillButton
        label={label}
        onPress={() => {
          onPress?.();
          onOpen();
        }}
      />
    )}
  />
);
