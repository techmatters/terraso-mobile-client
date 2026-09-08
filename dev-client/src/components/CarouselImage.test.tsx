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

import {Image} from 'react-native';

import {render, screen} from '@testing-library/react-native';

import {CarouselImage} from 'terraso-mobile-client/components/CarouselImage';

/* Carousel art usually restates the copy beside it, so it stays out of the
 * accessibility tree unless the caller says it carries something extra. */

const SOURCE = {uri: 'soil.png'};

const imageProps = () => screen.UNSAFE_getByType(Image).props;

describe('CarouselImage', () => {
  test('fills its zone without cropping', () => {
    render(<CarouselImage source={SOURCE} />);

    const {style, resizeMode} = imageProps();

    expect(resizeMode).toBe('contain');
    expect(style).toMatchObject({width: '100%', height: '100%'});
  });

  test('stays out of the accessibility tree when unlabeled', () => {
    render(<CarouselImage source={SOURCE} />);

    expect(imageProps().accessible).toBe(false);
    expect(screen.queryByRole('image')).toBeNull();
  });

  test('is announced when given a label', () => {
    render(<CarouselImage source={SOURCE} accessibilityLabel="Soil layers" />);

    expect(imageProps().accessible).toBe(true);
    expect(screen.getByLabelText('Soil layers')).toBeTruthy();
  });
});
