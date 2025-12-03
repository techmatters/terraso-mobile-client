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

import {
  SoilMetadataPushEntry,
  SoilMetadataPushFailureReason,
  UserMatchRating,
} from 'terraso-client-shared/graphqlSchema/graphql';

import {
  metadataMutationResponseToResults,
  unsyncedMetadataToMutationInput,
} from 'terraso-mobile-client/model/soilMetadata/soilMetadataPushUtils';

describe('soilMetadata push utilities', () => {
  describe('unsyncedMetadataToMutationInput', () => {
    it('should convert unsynced soilMetadata to mutation input', () => {
      const unsyncedData = {
        'site-1': {
          userRatings: [
            {soilMatchId: 'match-1', rating: 'SELECTED' as UserMatchRating},
            {soilMatchId: 'match-2', rating: 'UNSURE' as UserMatchRating},
          ],
        },
        'site-2': {
          userRatings: [
            {soilMatchId: 'match-3', rating: 'REJECTED' as UserMatchRating},
          ],
        },
      };

      const result = unsyncedMetadataToMutationInput(unsyncedData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        siteId: 'site-1',
        userRatings: [
          {soilMatchId: 'match-1', rating: 'SELECTED'},
          {soilMatchId: 'match-2', rating: 'UNSURE'},
        ],
      });
    });

    it('should skip sites with undefined data', () => {
      const unsyncedData = {
        'site-1': {
          userRatings: [
            {soilMatchId: 'match-1', rating: 'SELECTED' as UserMatchRating},
          ],
        },
        'site-2': undefined,
      };

      const result = unsyncedMetadataToMutationInput(unsyncedData);

      expect(result).toHaveLength(1);
      expect(result[0].siteId).toBe('site-1');
    });

    it('should handle empty userRatings array', () => {
      const unsyncedData = {
        'site-1': {userRatings: []},
      };

      const result = unsyncedMetadataToMutationInput(unsyncedData);

      expect(result).toHaveLength(1);
      expect(result[0].userRatings).toEqual([]);
    });
  });

  describe('metadataMutationResponseToResults', () => {
    it('should convert success responses to SyncResults', () => {
      const unsyncedChanges = {
        'site-1': {revisionId: 1},
      };

      const response = [
        {
          siteId: 'site-1',
          result: {
            soilMetadata: {
              userRatings: [
                {soilMatchId: 'match-1', rating: 'SELECTED' as UserMatchRating},
              ],
            },
          },
        },
      ];

      const results = metadataMutationResponseToResults(
        unsyncedChanges,
        response as SoilMetadataPushEntry[],
      );

      expect(results.errors['site-1']).toBeUndefined();
      expect(results.data['site-1']).toBeDefined();
      expect(results.data['site-1'].value.userRatings).toHaveLength(1);
      expect(results.data['site-1'].revisionId).toBe(1);
    });

    it('should convert failure responses with error reasons', () => {
      const unsyncedChanges = {
        'site-1': {revisionId: 1},
      };

      const response = [
        {
          siteId: 'site-1',
          result: {
            reason: 'NOT_ALLOWED' as SoilMetadataPushFailureReason,
          },
        },
      ];

      const results = metadataMutationResponseToResults(
        unsyncedChanges,
        response,
      );

      expect(results.errors['site-1'].value).toBe('NOT_ALLOWED');
      expect(results.errors['site-1'].revisionId).toBe(1);
      expect(results.data['site-1']).toBeUndefined();
    });

    it('should handle mixed success and failure', () => {
      const unsyncedChanges = {
        'site-1': {revisionId: 1},
        'site-2': {revisionId: 1},
      };

      const response = [
        {
          siteId: 'site-1',
          result: {soilMetadata: {userRatings: [], site: {} as any}},
        },
        {
          siteId: 'site-2',
          result: {reason: 'INVALID_DATA' as SoilMetadataPushFailureReason},
        },
      ];

      const results = metadataMutationResponseToResults(
        unsyncedChanges,
        response,
      );

      expect(results.data['site-1']).toBeDefined();
      expect(results.errors['site-1']).toBeUndefined();
      expect(results.errors['site-2'].value).toBe('INVALID_DATA');
      expect(results.data['site-2']).toBeUndefined();
    });
  });
});
