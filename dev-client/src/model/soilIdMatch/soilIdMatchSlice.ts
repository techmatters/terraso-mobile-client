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

import {createSlice, Draft} from '@reduxjs/toolkit';

import {User} from 'terraso-client-shared/account/accountSlice';
import {SoilIdInputData} from 'terraso-client-shared/graphqlSchema/graphql';
import * as soilIdService from 'terraso-client-shared/soilId/soilIdService';
import {createAsyncThunk, ThunkAPI} from 'terraso-client-shared/store/utils';
import {Coords} from 'terraso-client-shared/types';

import {getPostHogInstance} from 'terraso-mobile-client/app/posthogInstance';
import {
  CoordsKey,
  coordsKey,
  flushErrorEntries,
  siteEntry,
  siteEntryForStatus,
  SoilIdEntry,
  tempLocationEntry,
  tempLocationEntryForStatus,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {AppDispatch, AppState} from 'terraso-mobile-client/store';
import {doPromiseWithTimeoutAndLateReturn} from 'terraso-mobile-client/utils/promiseTimeoutUtil';

export type SoilState = {
  locationBasedMatches: Record<CoordsKey, SoilIdEntry>;

  // FYI: All site soil matches go here, even if there's no collected site data (and therefore no data match score)
  siteDataBasedMatches: Record<string, SoilIdEntry>;
};

export const initialState: SoilState = {
  locationBasedMatches: {},
  siteDataBasedMatches: {},
};

export const deleteSiteMatches = (
  state: Draft<SoilState>,
  siteIds: string[],
) => {
  for (const siteId of siteIds) {
    delete state.siteDataBasedMatches[siteId];
  }
};

// Type export for use in other files
export type SoilIdFetchedResult = Awaited<
  ReturnType<typeof soilIdService.fetchSoilMatches>
>;

const TIMEOUT_MS = 20_000;

// Helper function to track soil ID lookup events
const trackSoilIdLookup = (
  posthog: any,
  params: {
    lookupType: 'temporary_location' | 'site';
    coords: Coords;
    status: 'success' | 'error' | 'timeout';
    duration: number;
    matchCount?: number;
    errorMessage?: string;
    errorType?: string;
    siteId?: string;
    siteName?: string;
    hasSoilData?: boolean;
  },
) => {
  const baseEvent: Record<string, any> = {
    lookup_type: params.lookupType,
    latitude: params.coords.latitude,
    longitude: params.coords.longitude,
    status: params.status,
    duration_ms: params.duration,
  };

  // Add site-specific properties if applicable
  if (params.lookupType === 'site') {
    if (params.siteId) baseEvent.site_id = params.siteId;
    if (params.siteName) baseEvent.site_name = params.siteName;
    if (params.hasSoilData !== undefined) {
      baseEvent.has_soil_data = params.hasSoilData;
    }
  }

  // Handle different statuses
  if (params.status === 'success') {
    baseEvent.match_count = params.matchCount ?? 0;
  } else if (params.status === 'error') {
    baseEvent.error_message = params.errorMessage || 'Unknown error';
    baseEvent.error_type = params.errorType || 'UnknownError';
  }

  posthog?.capture('soil_id_lookup', baseEvent);
};

const fetchTempLocationBasedSoilMatchesImpl = async (
  coords: Coords,
  dispatch: AppDispatch,
) => {
  const startTime = Date.now();
  const posthog = getPostHogInstance();

  return await doPromiseWithTimeoutAndLateReturn<SoilIdEntry>({
    timeoutMs: TIMEOUT_MS,
    promiseToDo: soilIdService
      .fetchSoilMatches(coords, {
        depthDependentData: [],
      })
      .then(response => {
        const duration = Date.now() - startTime;
        // @ts-expect-error - optional chaining handles the union type safely
        const matchCount = response?.matches?.length ?? 0;

        // Track soil ID lookup
        trackSoilIdLookup(posthog, {
          lookupType: 'temporary_location',
          coords,
          status: 'success',
          duration,
          matchCount,
        });

        return tempLocationEntry(coords, response);
      })
      .catch(error => {
        const duration = Date.now() - startTime;

        // Track failed soil ID lookup
        trackSoilIdLookup(posthog, {
          lookupType: 'temporary_location',
          coords,
          status: 'error',
          duration,
          errorMessage: error?.message,
          errorType: error?.name,
        });

        throw error;
      }),
    doOnTimeout: () => {
      // Track timeout
      trackSoilIdLookup(posthog, {
        lookupType: 'temporary_location',
        coords,
        status: 'timeout',
        duration: TIMEOUT_MS,
      });

      return tempLocationEntryForStatus(coords, 'TIMEOUT');
    },
    doOnReturnAfterTimeout: (returnedEntry: SoilIdEntry) => {
      dispatch(updateTempMatches({coords, returnedEntry}));
    },
  });
};

const fetchSiteBasedSoilMatchesImpl = async (
  siteId: string,
  input: SoilIdInputData,
  state: AppState,
  dispatch: AppDispatch,
): Promise<SoilIdEntry> => {
  const site = state.site.sites[siteId];
  const posthog = getPostHogInstance();

  /* Nothing to fetch if the site doesn't exist */
  if (!site) {
    trackSoilIdLookup(posthog, {
      lookupType: 'site',
      coords: {latitude: 0, longitude: 0},
      status: 'error',
      duration: 0,
      errorMessage: 'Site not found',
      errorType: 'SiteNotFound',
      siteId,
    });
    return siteEntryForStatus(input, 'error');
  }

  const coords = {latitude: site.latitude, longitude: site.longitude};
  const startTime = Date.now();

  return await doPromiseWithTimeoutAndLateReturn<SoilIdEntry>({
    timeoutMs: TIMEOUT_MS,
    promiseToDo: soilIdService
      .fetchSoilMatches(coords, input)
      .then(response => {
        const duration = Date.now() - startTime;
        // @ts-expect-error - optional chaining handles the union type safely
        const matchCount = response?.matches?.length ?? 0;

        // Track soil ID lookup
        trackSoilIdLookup(posthog, {
          lookupType: 'site',
          coords,
          status: 'success',
          duration,
          matchCount,
          siteId,
          siteName: site.name,
          hasSoilData: (input.depthDependentData?.length ?? 0) > 0,
        });

        return siteEntry(input, response);
      })
      .catch(error => {
        const duration = Date.now() - startTime;

        // Track failed soil ID lookup
        trackSoilIdLookup(posthog, {
          lookupType: 'site',
          coords,
          status: 'error',
          duration,
          errorMessage: error?.message,
          errorType: error?.name,
          siteId,
          siteName: site.name,
          hasSoilData: (input.depthDependentData?.length ?? 0) > 0,
        });

        throw error;
      }),
    doOnTimeout: () => {
      // Track timeout
      trackSoilIdLookup(posthog, {
        lookupType: 'site',
        coords,
        status: 'timeout',
        duration: TIMEOUT_MS,
        siteId,
        siteName: site.name,
        hasSoilData: (input.depthDependentData?.length ?? 0) > 0,
      });

      return siteEntryForStatus(input, 'TIMEOUT');
    },
    doOnReturnAfterTimeout: (returnedEntry: SoilIdEntry) => {
      dispatch(updateSiteMatches({siteId, returnedEntry}));
    },
  });
};

const soilIdMatchSlice = createSlice({
  name: 'soilIdMatch',
  initialState,
  reducers: {
    flushLocationCache: state => {
      state.locationBasedMatches = {};
    },
    flushDataCacheErrors: state => {
      flushErrorEntries(state.siteDataBasedMatches);
    },
    updateTempMatches: (state, action) => {
      const coords = action.payload.coords;
      const key = coordsKey(coords);
      state.locationBasedMatches[key] = action.payload.returnedEntry;
    },
    updateSiteMatches: (state, action) => {
      const siteId = action.payload.siteId;
      state.siteDataBasedMatches[siteId] = action.payload.returnedEntry;
    },
  },
  extraReducers: builder => {
    builder.addCase(
      fetchTempLocationBasedSoilMatches.pending,
      (state, action) => {
        const coords = action.meta.arg;
        const key = coordsKey(coords);
        state.locationBasedMatches[key] = tempLocationEntryForStatus(
          coords,
          'loading',
        );
      },
    );

    builder.addCase(
      fetchTempLocationBasedSoilMatches.rejected,
      (state, action) => {
        const coords = action.meta.arg;
        const key = coordsKey(coords);
        state.locationBasedMatches[key] = tempLocationEntryForStatus(
          coords,
          'error',
        );
      },
    );

    builder.addCase(
      fetchTempLocationBasedSoilMatches.fulfilled,
      (state, action) => {
        const key = coordsKey(action.meta.arg);
        state.locationBasedMatches[key] = action.payload;
      },
    );

    builder.addCase(fetchSiteBasedSoilMatches.pending, (state, action) => {
      const siteId = action.meta.arg.siteId;
      const input = action.meta.arg.input;
      state.siteDataBasedMatches[siteId] = siteEntryForStatus(input, 'loading');
    });

    builder.addCase(fetchSiteBasedSoilMatches.rejected, (state, action) => {
      const siteId = action.meta.arg.siteId;
      const input = action.meta.arg.input;
      state.siteDataBasedMatches[siteId] = siteEntryForStatus(input, 'error');
    });

    builder.addCase(fetchSiteBasedSoilMatches.fulfilled, (state, action) => {
      const siteId = action.meta.arg.siteId;
      state.siteDataBasedMatches[siteId] = action.payload;
    });
  },
});

export const {
  flushLocationCache,
  flushDataCacheErrors,
  updateTempMatches,
  updateSiteMatches,
} = soilIdMatchSlice.actions;

export const fetchTempLocationBasedSoilMatches = createAsyncThunk(
  'soilId/fetchLocationBasedSoilMatches',
  async (coords: Coords, _: User | null, {dispatch}: ThunkAPI) =>
    fetchTempLocationBasedSoilMatchesImpl(coords, dispatch),
);

export const fetchSiteBasedSoilMatches = createAsyncThunk(
  'soilId/fetchDataBasedSoilMatches',
  async (
    params: {siteId: string; input: SoilIdInputData},
    _: User | null,
    thunkApi: ThunkAPI,
  ) =>
    fetchSiteBasedSoilMatchesImpl(
      params.siteId,
      params.input,
      thunkApi.getState() as AppState,
      thunkApi.dispatch,
    ),
);

export default soilIdMatchSlice.reducer;
