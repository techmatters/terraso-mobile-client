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

import type {UserRatingEntry} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilMetadata} from 'terraso-client-shared/soilId/soilIdTypes';

import * as featureFlags from 'terraso-mobile-client/config/featureFlags';
import {
  updateUserRatings,
  UpdateUserRatingsInput,
} from 'terraso-mobile-client/model/soilMetadata/localSoilMetadataActions';
import {AppState} from 'terraso-mobile-client/store';

// Mock config to avoid ENV_CONFIG errors
jest.mock('terraso-mobile-client/config/index', () => ({
  ENV_CONFIG: {
    TERRASO_BACKEND: 'http://test-backend',
  },
  APP_CONFIG: {
    environment: 'test',
  },
}));

// Mock feature flags
jest.mock('terraso-mobile-client/config/featureFlags');

// Helper to create minimal AppState
const createMockState = (siteId: string, metadata?: SoilMetadata): AppState => {
  const soilMetadata = metadata ? {[siteId]: metadata} : {};
  return {
    soilMetadata: {
      soilMetadata,
    },
  } as AppState;
};

// Helper to create rating input
const createRatingInput = (
  siteId: string,
  soilMatchId: string,
  rating: 'SELECTED' | 'REJECTED' | 'UNSURE',
): UpdateUserRatingsInput => ({
  siteId,
  userRating: {
    soilMatchId,
    rating,
  },
});

describe('updateUserRatings', () => {
  let mockIsFlagEnabled: jest.MockedFunction<typeof featureFlags.isFlagEnabled>;

  beforeEach(() => {
    // Get fresh reference to mocked function for each test
    mockIsFlagEnabled = featureFlags.isFlagEnabled as jest.MockedFunction<
      typeof featureFlags.isFlagEnabled
    >;

    // Default: flags enabled
    mockIsFlagEnabled.mockImplementation(
      (flag: string) => flag === 'FF_offline' || flag === 'FF_select_soil',
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Feature Flag Tests', () => {
    test('throws error when FF_offline is false', async () => {
      mockIsFlagEnabled.mockImplementation(
        (flag: string) => flag === 'FF_select_soil',
      );

      const state = createMockState('site-1');
      const input = createRatingInput('site-1', 'soil-1', 'SELECTED');

      await expect(updateUserRatings(input, state)).rejects.toThrow(
        'This code path should only be available with FF_select_soil and FF_offline flags on',
      );
    });

    test('throws error when FF_select_soil is false', async () => {
      mockIsFlagEnabled.mockImplementation(
        (flag: string) => flag === 'FF_offline',
      );

      const state = createMockState('site-1');
      const input = createRatingInput('site-1', 'soil-1', 'SELECTED');

      await expect(updateUserRatings(input, state)).rejects.toThrow(
        'This code path should only be available with FF_select_soil and FF_offline flags on',
      );
    });
  });

  describe('Initialization Tests', () => {
    test('creates new metadata when site has no existing data', async () => {
      const state = createMockState('unrelated-site');
      const input = createRatingInput('site-1', 'soil-1', 'SELECTED');

      const result = await updateUserRatings(input, state);

      expect(result).toEqual({
        userRatings: [{soilMatchId: 'soil-1', rating: 'SELECTED'}],
      });
    });

    test('uses existing metadata when present', async () => {
      const existingMetadata: SoilMetadata = {
        userRatings: [{soilMatchId: 'soil-1', rating: 'REJECTED'}],
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-2', 'SELECTED');

      const result = await updateUserRatings(input, state);

      expect(result.userRatings).toHaveLength(2);
      expect(result.userRatings).toContainEqual({
        soilMatchId: 'soil-1',
        rating: 'REJECTED',
      });
      expect(result.userRatings).toContainEqual({
        soilMatchId: 'soil-2',
        rating: 'SELECTED',
      });
    });

    test('does not mutate original state', async () => {
      const originalRatings: Array<UserRatingEntry> = [
        {soilMatchId: 'soil-1', rating: 'SELECTED'},
      ];
      const existingMetadata: SoilMetadata = {
        userRatings: originalRatings,
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-2', 'SELECTED');

      await updateUserRatings(input, state);

      // Original state should be unchanged
      expect(state.soilMetadata.soilMetadata['site-1']).toEqual({
        userRatings: [{soilMatchId: 'soil-1', rating: 'SELECTED'}],
      });
      expect(originalRatings).toEqual([
        {soilMatchId: 'soil-1', rating: 'SELECTED'},
      ]);
    });
  });

  describe('SELECTED Rating Tests', () => {
    test('selects first soil on empty site', async () => {
      const state = createMockState('site-1');
      const input = createRatingInput('site-1', 'soil-1', 'SELECTED');

      const result = await updateUserRatings(input, state);

      expect(result.userRatings).toEqual([
        {soilMatchId: 'soil-1', rating: 'SELECTED'},
      ]);
    });

    test('selecting different soil removes previous selection', async () => {
      const existingMetadata: SoilMetadata = {
        userRatings: [{soilMatchId: 'soil-1', rating: 'SELECTED'}],
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-2', 'SELECTED');

      const result = await updateUserRatings(input, state);

      expect(result.userRatings).toEqual([
        {soilMatchId: 'soil-2', rating: 'SELECTED'},
      ]);
      // Verify only one SELECTED rating exists
      const selectedCount = result.userRatings.filter(
        entry => entry?.rating === 'SELECTED',
      ).length;
      expect(selectedCount).toBe(1);
    });

    test('re-selecting same soil is idempotent', async () => {
      const existingMetadata: SoilMetadata = {
        userRatings: [{soilMatchId: 'soil-1', rating: 'SELECTED'}],
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-1', 'SELECTED');

      const result = await updateUserRatings(input, state);

      expect(result.userRatings).toEqual([
        {soilMatchId: 'soil-1', rating: 'SELECTED'},
      ]);
    });

    test('selecting soil that was previously rejected', async () => {
      const existingMetadata: SoilMetadata = {
        userRatings: [
          {soilMatchId: 'soil-1', rating: 'REJECTED'},
          {soilMatchId: 'soil-2', rating: 'SELECTED'},
        ],
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-1', 'SELECTED');

      const result = await updateUserRatings(input, state);

      expect(result.userRatings).toEqual([
        {soilMatchId: 'soil-1', rating: 'SELECTED'},
      ]);
      // Verify previous selection and rejection both removed
      const selectedCount = result.userRatings.filter(
        entry => entry?.rating === 'SELECTED',
      ).length;
      expect(selectedCount).toBe(1);
      expect(
        result.userRatings.find(entry => entry?.soilMatchId === 'soil-2'),
      ).toBe(undefined);
    });

    test('selecting preserves unrelated ratings', async () => {
      const existingMetadata: SoilMetadata = {
        userRatings: [
          {soilMatchId: 'soil-1', rating: 'REJECTED'},
          {soilMatchId: 'soil-2', rating: 'UNSURE'},
        ],
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-3', 'SELECTED');

      const result = await updateUserRatings(input, state);

      expect(result.userRatings).toHaveLength(3);
      expect(result.userRatings).toContainEqual({
        soilMatchId: 'soil-1',
        rating: 'REJECTED',
      });
      expect(result.userRatings).toContainEqual({
        soilMatchId: 'soil-2',
        rating: 'UNSURE',
      });
      expect(result.userRatings).toContainEqual({
        soilMatchId: 'soil-3',
        rating: 'SELECTED',
      });
    });
  });

  describe('REJECTED Rating Tests', () => {
    test('rejects soil with no prior rating', async () => {
      const existingMetadata: SoilMetadata = {
        userRatings: [],
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-1', 'REJECTED');

      const result = await updateUserRatings(input, state);

      expect(result.userRatings).toEqual([
        {soilMatchId: 'soil-1', rating: 'REJECTED'},
      ]);
    });

    test('rejecting previously selected soil', async () => {
      const existingMetadata: SoilMetadata = {
        userRatings: [{soilMatchId: 'soil-1', rating: 'SELECTED'}],
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-1', 'REJECTED');

      const result = await updateUserRatings(input, state);

      expect(result.userRatings).toEqual([
        {soilMatchId: 'soil-1', rating: 'REJECTED'},
      ]);
    });

    test('rejecting preserves other selected soil', async () => {
      const existingMetadata: SoilMetadata = {
        userRatings: [{soilMatchId: 'soil-1', rating: 'SELECTED'}],
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-2', 'REJECTED');

      const result = await updateUserRatings(input, state);

      expect(result.userRatings).toHaveLength(2);
      expect(result.userRatings).toContainEqual({
        soilMatchId: 'soil-1',
        rating: 'SELECTED',
      });
      expect(result.userRatings).toContainEqual({
        soilMatchId: 'soil-2',
        rating: 'REJECTED',
      });
    });

    test('re-rejecting is idempotent', async () => {
      const existingMetadata: SoilMetadata = {
        userRatings: [{soilMatchId: 'soil-1', rating: 'REJECTED'}],
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-1', 'REJECTED');

      const result = await updateUserRatings(input, state);

      expect(result.userRatings).toEqual([
        {soilMatchId: 'soil-1', rating: 'REJECTED'},
      ]);
    });
  });

  describe('UNSURE Rating Tests', () => {
    test('marks as unsure with no prior rating', async () => {
      const existingMetadata: SoilMetadata = {
        userRatings: [],
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-1', 'UNSURE');

      const result = await updateUserRatings(input, state);

      expect(result.userRatings).toEqual([
        {soilMatchId: 'soil-1', rating: 'UNSURE'},
      ]);
    });

    test('changes selected to unsure', async () => {
      const existingMetadata: SoilMetadata = {
        userRatings: [{soilMatchId: 'soil-1', rating: 'SELECTED'}],
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-1', 'UNSURE');

      const result = await updateUserRatings(input, state);

      expect(result.userRatings).toEqual([
        {soilMatchId: 'soil-1', rating: 'UNSURE'},
      ]);
    });

    test('marking soil unsure preserves other ratings', async () => {
      const existingMetadata: SoilMetadata = {
        userRatings: [
          {soilMatchId: 'soil-1', rating: 'SELECTED'},
          {soilMatchId: 'soil-2', rating: 'REJECTED'},
        ],
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-3', 'UNSURE');

      const result = await updateUserRatings(input, state);

      expect(result.userRatings).toHaveLength(3);
      expect(result.userRatings).toContainEqual({
        soilMatchId: 'soil-1',
        rating: 'SELECTED',
      });
      expect(result.userRatings).toContainEqual({
        soilMatchId: 'soil-2',
        rating: 'REJECTED',
      });
      expect(result.userRatings).toContainEqual({
        soilMatchId: 'soil-3',
        rating: 'UNSURE',
      });
    });
  });

  describe('Edge Cases', () => {
    // The current type supports null ratings, but we don't currently expect any nulls in actual app behavior, so perhaps they should not
    test('handles null entries in existing userRatings array', async () => {
      const existingMetadata: SoilMetadata = {
        userRatings: [
          null,
          {soilMatchId: 'soil-1', rating: 'REJECTED'},
          null,
          {soilMatchId: 'soil-2', rating: 'UNSURE'},
        ],
      };
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-3', 'SELECTED');

      const result = await updateUserRatings(input, state);

      // Null entries are currently preserved by the spread operator
      expect(result.userRatings).toHaveLength(5);
      expect(result.userRatings).toContainEqual({
        soilMatchId: 'soil-1',
        rating: 'REJECTED',
      });
      expect(result.userRatings).toContainEqual({
        soilMatchId: 'soil-2',
        rating: 'UNSURE',
      });
      expect(result.userRatings).toContainEqual({
        soilMatchId: 'soil-3',
        rating: 'SELECTED',
      });
      // Verify null entries are preserved (current behavior)
      expect(result.userRatings.filter(entry => entry === null)).toHaveLength(
        2,
      );
    });

    test('multiple selections in sequence only keeps last', async () => {
      let state = createMockState('site-1');

      // Select soil-1
      let input = createRatingInput('site-1', 'soil-1', 'SELECTED');
      let result = await updateUserRatings(input, state);
      state = createMockState('site-1', result);

      expect(result.userRatings).toHaveLength(1);
      expect(result.userRatings[0]).toEqual({
        soilMatchId: 'soil-1',
        rating: 'SELECTED',
      });

      // Select soil-2
      input = createRatingInput('site-1', 'soil-2', 'SELECTED');
      result = await updateUserRatings(input, state);
      state = createMockState('site-1', result);

      expect(result.userRatings).toHaveLength(1);
      expect(result.userRatings[0]).toEqual({
        soilMatchId: 'soil-2',
        rating: 'SELECTED',
      });

      // Select soil-3
      input = createRatingInput('site-1', 'soil-3', 'SELECTED');
      result = await updateUserRatings(input, state);

      expect(result.userRatings).toHaveLength(1);
      expect(result.userRatings[0]).toEqual({
        soilMatchId: 'soil-3',
        rating: 'SELECTED',
      });
    });

    test('maintain any other metadata properties besides userRatings', async () => {
      const existingMetadata = {
        userRatings: [{soilMatchId: 'soil-1', rating: 'REJECTED'}],
        someOtherProperty: 'value',
        anotherProperty: {nested: 'data'},
      } as SoilMetadata;
      const state = createMockState('site-1', existingMetadata);
      const input = createRatingInput('site-1', 'soil-2', 'SELECTED');

      const result = await updateUserRatings(input, state);

      const resultWithExtras = result as SoilMetadata & {
        someOtherProperty?: string;
        anotherProperty?: {nested: string};
      };
      expect(resultWithExtras.someOtherProperty).toBe('value');
      expect(resultWithExtras.anotherProperty).toEqual({nested: 'data'});
      expect(result.userRatings).toHaveLength(2);
    });
  });
});
