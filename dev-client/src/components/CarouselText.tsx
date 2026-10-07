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

import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';

/*
 * Body copy for a carousel page. Exists so the pCarousel variant and its leading
 * travel together: the leading cannot live in the variant, because the native
 * base adapter maps no lineHeight prop and silently drops it from variant
 * styles, so it only takes effect as a real style.
 */
export const CarouselText = ({children}: React.PropsWithChildren) => (
  <Text variant="pCarousel" style={styles.text}>
    {children}
  </Text>
);

const styles = StyleSheet.create({
  /* lineHeight is 1.5x the variant's 20px type. Move it into the variant in theme.ts if that ever supports lineHeight. */
  text: {
    lineHeight: 30,
    textAlign: 'center',
  },
});
