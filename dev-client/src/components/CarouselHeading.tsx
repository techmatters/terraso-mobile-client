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

import {StyleSheet} from 'react-native';

import {Heading} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {theme} from 'terraso-mobile-client/theme';

/*
 * Title for a carousel page, above its CarouselText body. Carries the variant,
 * the centering and the gap to the copy so every carousel states them once here
 * rather than at each page it builds.
 */
export const CarouselHeading = ({children}: React.PropsWithChildren) => (
  <Heading variant="h4" style={styles.heading}>
    {children}
  </Heading>
);

const styles = StyleSheet.create({
  heading: {
    textAlign: 'center',
    paddingBottom: theme.space.md,
  },
});
