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

import {
  SiteNode,
  SoilDataNode,
  SoilDataPushEntry,
  SoilDataPushFailureReason,
} from 'terraso-client-shared/graphqlSchema/graphql';

import {mutationResponseToResults} from 'terraso-mobile-client/model/soilId/actions/remoteSoilDataActions';
import {SoilData} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {ChangeRecords} from 'terraso-mobile-client/model/sync/sync';

describe('mutationResponseToResults', () => {
  let unsyncedChanges: ChangeRecords<SoilData, SoilDataPushFailureReason>;
  let response: SoilDataPushEntry[];

  beforeEach(() => {
    unsyncedChanges = {};
    response = [];
  });

  test('returns soil data with input revision ids', () => {
    unsyncedChanges.a = {revisionId: 10};
    response = [
      {
        siteId: 'a',
        result: {
          site: {
            soilData: {
              crossSlope: 'CONCAVE',
            } as SoilDataNode,
          } as SiteNode,
        },
      },
    ];

    const results = mutationResponseToResults(unsyncedChanges, response);
    expect(results.data.a).toEqual({
      revisionId: 10,
      data: {
        crossSlope: 'CONCAVE',
      },
    });
    expect(results.errors).toEqual({});
  });

  test('returns errors with input revision ids', () => {
    unsyncedChanges.a = {revisionId: 10};
    response = [
      {
        siteId: 'a',
        result: {
          reason: 'DOES_NOT_EXIST',
        },
      },
    ];
    const results = mutationResponseToResults(unsyncedChanges, response);
    expect(results.data).toEqual({});
    expect(results.errors.a).toEqual({revisionId: 10, data: 'DOES_NOT_EXIST'});
  });
});
