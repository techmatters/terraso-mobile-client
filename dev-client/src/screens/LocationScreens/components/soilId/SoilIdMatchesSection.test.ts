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

import type {
  SoilMatch,
  UserRatingEntry,
} from 'terraso-client-shared/graphqlSchema/graphql';

import {getTileVariant} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/soilMatchTileVariants';

// Helper to create a minimal SoilMatch object
const createSoilMatch = (name: string): SoilMatch => {
  return {
    soilInfo: {
      soilSeries: {
        name,
      },
    },
  } as SoilMatch;
};

describe('getTileVariant', () => {
  describe('when a soil is selected', () => {
    test('returns Selected for the selected soil', () => {
      const soilMatch = createSoilMatch('Typic Hapludolls');
      const userRatings: UserRatingEntry[] = [
        {soilMatchId: 'Typic Hapludolls', rating: 'SELECTED'},
      ];
      const selectedSoilId = 'Typic Hapludolls';

      const result = getTileVariant(soilMatch, userRatings, selectedSoilId);

      expect(result).toBe('Selected');
    });

    test('returns Rejected for other soils when one is selected', () => {
      const soilMatch = createSoilMatch('Aquic Argiudolls');
      const userRatings: UserRatingEntry[] = [
        {soilMatchId: 'Typic Hapludolls', rating: 'SELECTED'},
      ];
      const selectedSoilId = 'Typic Hapludolls';

      const result = getTileVariant(soilMatch, userRatings, selectedSoilId);

      expect(result).toBe('Rejected');
    });

    test('returns Rejected for rejected soil when another is selected', () => {
      const soilMatch = createSoilMatch('Aquic Argiudolls');
      const userRatings: UserRatingEntry[] = [
        {soilMatchId: 'Typic Hapludolls', rating: 'SELECTED'},
        {soilMatchId: 'Aquic Argiudolls', rating: 'REJECTED'},
      ];
      const selectedSoilId = 'Typic Hapludolls';

      const result = getTileVariant(soilMatch, userRatings, selectedSoilId);

      expect(result).toBe('Rejected');
    });

    test('returns Rejected for unsure soil when another is selected', () => {
      const soilMatch = createSoilMatch('Aquic Argiudolls');
      const userRatings: UserRatingEntry[] = [
        {soilMatchId: 'Typic Hapludolls', rating: 'SELECTED'},
        {soilMatchId: 'Aquic Argiudolls', rating: 'UNSURE'},
      ];
      const selectedSoilId = 'Typic Hapludolls';

      const result = getTileVariant(soilMatch, userRatings, selectedSoilId);

      expect(result).toBe('Rejected');
    });
  });

  describe('when no soil is selected', () => {
    test('returns Default for soil with no rating', () => {
      const soilMatch = createSoilMatch('Typic Hapludolls');
      const userRatings: UserRatingEntry[] = [];
      const selectedSoilId = undefined;

      const result = getTileVariant(soilMatch, userRatings, selectedSoilId);

      expect(result).toBe('Default');
    });

    test('returns Default for soil rated as UNSURE', () => {
      const soilMatch = createSoilMatch('Typic Hapludolls');
      const userRatings: UserRatingEntry[] = [
        {soilMatchId: 'Typic Hapludolls', rating: 'UNSURE'},
      ];
      const selectedSoilId = undefined;

      const result = getTileVariant(soilMatch, userRatings, selectedSoilId);

      expect(result).toBe('Default');
    });

    test('returns Rejected for soil rated as REJECTED', () => {
      const soilMatch = createSoilMatch('Typic Hapludolls');
      const userRatings: UserRatingEntry[] = [
        {soilMatchId: 'Typic Hapludolls', rating: 'REJECTED'},
      ];
      const selectedSoilId = undefined;

      const result = getTileVariant(soilMatch, userRatings, selectedSoilId);

      expect(result).toBe('Rejected');
    });

    test('returns Default for soil rated as SELECTED (edge case, should not happen)', () => {
      // If a soil is SELECTED but selectedSoilId is undefined, treat as default
      // This shouldn't happen in practice but tests the logic
      const soilMatch = createSoilMatch('Typic Hapludolls');
      const userRatings: UserRatingEntry[] = [
        {soilMatchId: 'Typic Hapludolls', rating: 'SELECTED'},
      ];
      const selectedSoilId = undefined;

      const result = getTileVariant(soilMatch, userRatings, selectedSoilId);

      expect(result).toBe('Default');
    });
  });

  describe('edge cases', () => {
    test('handles empty userRatings array', () => {
      const soilMatch = createSoilMatch('Typic Hapludolls');
      const userRatings: UserRatingEntry[] = [];
      const selectedSoilId = undefined;

      const result = getTileVariant(soilMatch, userRatings, selectedSoilId);

      expect(result).toBe('Default');
    });

    test('handles undefined userRatings', () => {
      const soilMatch = createSoilMatch('Typic Hapludolls');
      const userRatings = undefined;
      const selectedSoilId = undefined;

      const result = getTileVariant(soilMatch, userRatings, selectedSoilId);

      expect(result).toBe('Default');
    });

    test('handles userRatings for different soils', () => {
      const soilMatch = createSoilMatch('Typic Hapludolls');
      const userRatings: UserRatingEntry[] = [
        {soilMatchId: 'Aquic Argiudolls', rating: 'REJECTED'},
        {soilMatchId: 'Typic Argiudolls', rating: 'UNSURE'},
      ];
      const selectedSoilId = undefined;

      const result = getTileVariant(soilMatch, userRatings, selectedSoilId);

      expect(result).toBe('Default');
    });

    test('handles empty string selectedSoilId', () => {
      const soilMatch = createSoilMatch('Typic Hapludolls');
      const userRatings: UserRatingEntry[] = [];
      const selectedSoilId = '';

      const result = getTileVariant(soilMatch, userRatings, selectedSoilId);

      // Empty string is falsy, so should follow the "no selection" path
      expect(result).toBe('Default');
    });

    test('handles whitespace in soil names', () => {
      const soilMatch = createSoilMatch('  Typic Hapludolls  ');
      const userRatings: UserRatingEntry[] = [
        {soilMatchId: '  Typic Hapludolls  ', rating: 'REJECTED'},
      ];
      const selectedSoilId = undefined;

      const result = getTileVariant(soilMatch, userRatings, selectedSoilId);

      expect(result).toBe('Rejected');
    });
  });
});
