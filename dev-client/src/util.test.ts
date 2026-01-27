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

import {isValidCoordinates} from 'terraso-mobile-client/util';

describe('isValidCoordinates', () => {
  describe('valid coordinates', () => {
    it('accepts basic lat,lng format', () => {
      expect(isValidCoordinates('12.345, 67.890')).toBe(true);
    });

    it('accepts without space after comma', () => {
      expect(isValidCoordinates('12.345,67.890')).toBe(true);
    });

    it('accepts negative coordinates', () => {
      expect(isValidCoordinates('-12.345, -67.890')).toBe(true);
      expect(isValidCoordinates('-12.345, 67.890')).toBe(true);
      expect(isValidCoordinates('12.345, -67.890')).toBe(true);
    });

    it('accepts boundary values', () => {
      expect(isValidCoordinates('90, 180')).toBe(true);
      expect(isValidCoordinates('-90, -180')).toBe(true);
      expect(isValidCoordinates('90.00, -180.00')).toBe(true);
      expect(isValidCoordinates('0, 0')).toBe(true);
    });

    it('accepts integer coordinates', () => {
      expect(isValidCoordinates('45, 90')).toBe(true);
      expect(isValidCoordinates('0, 0')).toBe(true);
    });

    it('accepts coordinates with many decimal places', () => {
      expect(isValidCoordinates('12.3456789, 67.8901234')).toBe(true);
    });

    it('accepts coordinates with plus sign', () => {
      expect(isValidCoordinates('+12.345, +67.890')).toBe(true);
    });

    it('accepts single digit coordinates', () => {
      expect(isValidCoordinates('1, 1')).toBe(true);
      expect(isValidCoordinates('9, 9')).toBe(true);
    });

    it('accepts mixed decimal and integer coordinates', () => {
      // When user types "12.3, 4" intending "12.3, 45.6",
      // the current validation passes because 4 is a valid longitude
      expect(isValidCoordinates('12.3, 4')).toBe(true);
      expect(isValidCoordinates('12, 4.5')).toBe(true);
    });
  });

  describe('invalid coordinates', () => {
    it('rejects latitude out of range', () => {
      expect(isValidCoordinates('90.1, 0')).toBe(false);
      expect(isValidCoordinates('91, 0')).toBe(false);
      expect(isValidCoordinates('-91, 0')).toBe(false);
      expect(isValidCoordinates('100, 0')).toBe(false);
    });

    it('rejects longitude out of range', () => {
      expect(isValidCoordinates('0, 181')).toBe(false);
      expect(isValidCoordinates('0, -181')).toBe(false);
      expect(isValidCoordinates('0, 200')).toBe(false);
    });

    it('rejects missing longitude', () => {
      expect(isValidCoordinates('12.345')).toBe(false);
      expect(isValidCoordinates('12.345,')).toBe(false);
      expect(isValidCoordinates('12.345, ')).toBe(false);
    });

    it('rejects non-numeric input', () => {
      expect(isValidCoordinates('abc, def')).toBe(false);
      expect(isValidCoordinates('12.345, abc')).toBe(false);
      expect(isValidCoordinates('abc, 67.890')).toBe(false);
    });

    it('rejects empty or whitespace input', () => {
      expect(isValidCoordinates('')).toBe(false);
      expect(isValidCoordinates('   ')).toBe(false);
    });

    it('rejects address-like input', () => {
      expect(isValidCoordinates('123 Main St')).toBe(false);
      expect(isValidCoordinates('New York, NY')).toBe(false);
    });
  });
});
