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

import {Text} from 'react-native';
import PagerView from 'react-native-pager-view';
import {SafeAreaInsetsContext} from 'react-native-safe-area-context';

import {fireEvent, render, screen} from '@testing-library/react-native';

import {Carousel} from 'terraso-mobile-client/components/Carousel';

/* Side-effect import: initializes i18next so the indicator's accessibility
 * label resolves to a real string instead of the bare key. */
import 'terraso-mobile-client/translations';

/* The indicator is the only thing tying the two zones together, so these cover
 * that it tracks the pager and that both zones actually page as one unit. */

const PAGES = [
  {key: 'a', above: <Text>art A</Text>, below: <Text>copy A</Text>},
  {key: 'b', above: <Text>art B</Text>, below: <Text>copy B</Text>},
  {key: 'c', above: <Text>art C</Text>, below: <Text>copy C</Text>},
];

/* The copy zone pads itself clear of the bottom inset, and useSafeAreaInsets throws outright when nothing supplies one. Feeding the context directly is enough — SafeAreaProvider would add frame plumbing no test here reads. */
const renderCarousel = (
  props: Partial<React.ComponentProps<typeof Carousel>> = {},
) =>
  render(
    <SafeAreaInsetsContext.Provider
      value={{top: 0, left: 0, right: 0, bottom: 0}}>
      <Carousel pages={PAGES} aboveHeight={200} {...props} />
    </SafeAreaInsetsContext.Provider>,
  );

/* PagerView renders every page up front, so the pager itself is what reports
 * position — there is no "the visible page" to query for in a unit test. */
const selectPage = (position: number) =>
  fireEvent(screen.UNSAFE_getByType(PagerView), 'pageSelected', {
    nativeEvent: {position},
  });

describe('Carousel', () => {
  test('renders both zones for every page', () => {
    renderCarousel();

    for (const suffix of ['A', 'B', 'C']) {
      expect(screen.getByText(`art ${suffix}`)).toBeTruthy();
      expect(screen.getByText(`copy ${suffix}`)).toBeTruthy();
    }
  });

  test('reports the starting page to screen readers', () => {
    renderCarousel();

    expect(screen.getByLabelText('Page 1 of 3')).toBeTruthy();
  });

  test('honors initialPage', () => {
    renderCarousel({initialPage: 2});

    expect(screen.getByLabelText('Page 3 of 3')).toBeTruthy();
  });

  test('advances the indicator when the pager changes page', () => {
    renderCarousel();

    selectPage(1);

    expect(screen.getByLabelText('Page 2 of 3')).toBeTruthy();
    expect(screen.queryByLabelText('Page 1 of 3')).toBeNull();
  });

  test('notifies the caller of page changes', () => {
    const onPageChange = jest.fn();
    renderCarousel({onPageChange});

    selectPage(2);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
