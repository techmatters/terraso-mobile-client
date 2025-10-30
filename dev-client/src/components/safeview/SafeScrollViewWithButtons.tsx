/*
 * Copyright © 2025 Technology Matters
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

import {IScrollViewProps} from 'native-base';

import {SafeScrollView} from 'terraso-mobile-client/components/safeview/SafeScrollView';
import {SAFE_AREA_BOTTOM_PADDING_WITH_BUTTONS} from 'terraso-mobile-client/constants/safeArea';

/**
 * A specialized SafeScrollView with extra bottom padding for screens that have a row
 * of action buttons at the bottom (e.g., Delete/Done, Cancel/Save button pairs).
 *
 * This variant uses SAFE_AREA_BOTTOM_PADDING_WITH_BUTTONS (80px) to ensure content can
 * scroll clear of large button rows, accounting for button height + spacing + clearance.
 *
 * Use this instead of SafeScrollView when your screen has button rows at the bottom.
 * For screens with FAB buttons, use SafeScrollViewWithFab instead.
 * For screens without bottom action buttons, use the base SafeScrollView.
 *
 * @example
 * <SafeScrollViewWithButtons>
 *   <Text>Form content</Text>
 * </SafeScrollViewWithButtons>
 * <Row>
 *   <DeleteButton />
 *   <ContainedButton label="Done" />
 * </Row>
 */
export const SafeScrollViewWithButtons = (props: IScrollViewProps) => (
  <SafeScrollView
    minimumPadding={SAFE_AREA_BOTTOM_PADDING_WITH_BUTTONS}
    {...props}
  />
);
