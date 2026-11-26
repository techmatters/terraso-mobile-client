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
import {createSlice, PayloadAction} from '@reduxjs/toolkit';

import {ReanchorReport} from 'terraso-mobile-client/model/sync/reanchorThunk';

export type SyncState = {
  pullRequested: boolean;
  // One-time "re-anchor to prod" (see reanchorThunk / docs). `reanchorPending`
  // blocks the normal pull while the re-anchor fetch is in flight so it can't
  // clobber local edits first; `reanchorDone` mirrors the persisted MMKV flag.
  reanchorPending: boolean;
  reanchorDone: boolean;
  // What the last re-anchor marked (create/update per entity), set by the
  // fulfilled reducer and read by ReanchorDispatcher for PostHog reporting.
  reanchorReport: ReanchorReport | null;
};

export const initialState: SyncState = {
  pullRequested: false,
  reanchorPending: false,
  reanchorDone: false,
  reanchorReport: null,
};

export const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setPullRequested: (state, action: PayloadAction<boolean>) => ({
      ...state,
      pullRequested: action.payload,
    }),
    setReanchorPending: (state, action: PayloadAction<boolean>) => ({
      ...state,
      reanchorPending: action.payload,
    }),
    setReanchorDone: (state, action: PayloadAction<boolean>) => ({
      ...state,
      reanchorDone: action.payload,
    }),
  },
});

export const {setPullRequested, setReanchorPending, setReanchorDone} =
  syncSlice.actions;

export default syncSlice.reducer;
