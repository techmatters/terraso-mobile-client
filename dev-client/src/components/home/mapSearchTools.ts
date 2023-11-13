/*
 * Copyright © 2023 Technology Matters
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

import {APP_CONFIG} from 'terraso-mobile-client/config';
import {v4 as uuidv4} from 'uuid';

interface SuggestionResponse {
  suggestions: Suggestion[];
  attribution: string;
}

export interface Suggestion {
  name: string;
  name_preferred: string;
  mapbox_id: string;
  feature_type: string;
  address: string;
  full_address: string;
  place_formatted: string;
  distance: number;
  /**
   * See other properties at https://docs.mapbox.com/api/search/search-box/#response-get-suggested-results
   */
}

type Session = {
  token: string;
  queries: number;
};

async function checkResponse(resp: Response) {
  if (!resp.ok) {
    try {
      // if response has error details, try to include that in exception
      const payload = resp.json();
      throw Error(JSON.stringify(payload));
    } catch (e) {
      // if not, just include error and status text
      throw Error(`HTTP Error: ${resp.status}, ${resp.statusText}`);
    }
  }
  return resp.json();
}

function initSession(): Session {
  return {
    token: uuidv4(),
    queries: 0,
  };
}

const ACCESS_TOKEN = APP_CONFIG.mapboxAccessToken;
const SESSION_MAX_QUERIES = 50;
const BASE_URI = 'https://api.mapbox.com/search/searchbox/v1';

/**
 * Interface to mapbox Search API: https://docs.mapbox.com/api/search/search-box/
 */
export function initMapSearch() {
  let session = initSession();

  /**
   * Queries the suggestions API
   * TODO: We can limit suggestions to certain categories of locations
   * TODO: Option to pass user's location directly as `proximity` param,
   *       would this be more reliable than relying on IP
   * TODO: For US version we can restrict queries to country
   */
  const getSuggestions = async (query: string, signal: AbortSignal) => {
    try {
      const resp = await fetch(
        `${BASE_URI}/suggest?` +
          `q=${query}&access_token=${ACCESS_TOKEN}&session_token=${session.token}&types=place,address,street,block,poi`,
        {signal},
      );
      const payload = (await checkResponse(resp)) as SuggestionResponse;
      return payload;
    } finally {
      if (session.queries > SESSION_MAX_QUERIES) {
        session = initSession();
      }
      session.queries++;
    }
  };

  const retrieveFeature = async (featureId: string) => {
    try {
      const resp = await fetch(
        `${BASE_URI}/retrieve/${featureId}?access_token=${ACCESS_TOKEN}&session_token=${session.token}`,
      );

      const payload = (await checkResponse(resp)) as GeoJSON.FeatureCollection;
      return payload;
    } finally {
      session = initSession();
    }
  };

  return {getSuggestions, retrieveFeature};
}
