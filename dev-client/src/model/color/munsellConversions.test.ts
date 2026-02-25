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

import {munsellHVCToLAB} from 'terraso-mobile-client/model/color/colorConversions';
import testData from 'terraso-mobile-client/model/color/munsellTestData.json';
import {MunsellHVC} from 'terraso-mobile-client/model/color/types';

type TestEntry = {
  munsell: string;
  hue100: number;
  value: number;
  chroma: number;
  lab: {L: number; A: number; B: number};
  hex: string;
};

describe('munsellHVCToLAB matches reference data', () => {
  it.each(testData.entries as TestEntry[])(
    '$munsell → LAB',
    ({hue100, value, chroma, lab: expected}) => {
      const hvc: MunsellHVC = [hue100, value, chroma] as const;
      const result = munsellHVCToLAB(hvc);

      expect(result.L).toBeCloseTo(expected.L, 2);
      expect(result.A).toBeCloseTo(expected.A, 2);
      expect(result.B).toBeCloseTo(expected.B, 2);
    },
  );
});
