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

import {User} from 'terraso-client-shared/account/accountSlice';
import {
  SiteAddMutationInput,
  SiteNoteAddMutationInput,
  SiteNoteUpdateMutationInput,
  SiteUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import * as siteService from 'terraso-client-shared/site/siteService';
import {Site, SiteNote} from 'terraso-client-shared/site/siteTypes';
import {ThunkAPI} from 'terraso-client-shared/store/utils';

import {syncDebugEnabled} from 'terraso-mobile-client/config';
import {isFlagEnabled} from 'terraso-mobile-client/config/featureFlags';
import * as localSite from 'terraso-mobile-client/model/site/actions/localSiteActions';
import {AppState} from 'terraso-mobile-client/store';

export const addSiteAction = async (
  input: SiteAddMutationInput,
  _: User | null,
  thunkApi: ThunkAPI,
): Promise<Site> => {
  if (isFlagEnabled('FF_offline')) {
    const state = thunkApi.getState() as AppState;
    const result = localSite.addSite(input, state);
    if (syncDebugEnabled) {
      console.log('🏗️ addSiteAction (local)', result.id, input.name);
    }
    return Promise.resolve(result);
  } else {
    if (syncDebugEnabled) {
      console.log('🏗️ addSiteAction (remote)', input.name);
    }
    return siteService.addSite(input);
  }
};

export const updateSiteAction = async (
  input: SiteUpdateMutationInput,
  _: User | null,
  thunkApi: ThunkAPI,
): Promise<Site> => {
  if (isFlagEnabled('FF_offline')) {
    const state = thunkApi.getState() as AppState;
    const site = state.site.sites[input.id];
    const result = localSite.updateSite(input, site);
    if (syncDebugEnabled) {
      console.log('✏️ updateSiteAction (local)', input.id, input);
    }
    return Promise.resolve(result);
  } else {
    if (syncDebugEnabled) {
      console.log('✏️ updateSiteAction (remote)', input.id, input);
    }
    return siteService.updateSite(input);
  }
};

export const addSiteNoteAction = async (
  input: SiteNoteAddMutationInput,
  _: User | null,
  thunkApi: ThunkAPI,
): Promise<SiteNote> => {
  if (isFlagEnabled('FF_offline')) {
    const state = thunkApi.getState() as AppState;
    const result = localSite.addSiteNote(input, state);
    if (syncDebugEnabled) {
      console.log(
        '📝 addSiteNoteAction (local)',
        result.id,
        'for site',
        input.siteId,
      );
    }
    return Promise.resolve(result);
  } else {
    if (syncDebugEnabled) {
      console.log('📝 addSiteNoteAction (remote)', 'for site', input.siteId);
    }
    return siteService.addSiteNote(input);
  }
};

export const updateSiteNoteAction = async (
  input: SiteNoteUpdateMutationInput,
  _: User | null,
  thunkApi: ThunkAPI,
): Promise<SiteNote> => {
  if (isFlagEnabled('FF_offline')) {
    const state = thunkApi.getState() as AppState;
    const note = findSiteNote(state, input.id);
    if (syncDebugEnabled) {
      console.log('📝 updateSiteNoteAction (local)', input.id);
    }
    return Promise.resolve(localSite.updateSiteNote(input, note));
  } else {
    if (syncDebugEnabled) {
      console.log('📝 updateSiteNoteAction (remote)', input.id);
    }
    return siteService.updateSiteNote(input);
  }
};

export const deleteSiteNoteAction = async (
  input: SiteNote,
  _: User | null,
): Promise<SiteNote> => {
  if (isFlagEnabled('FF_offline')) {
    if (syncDebugEnabled) {
      console.log(
        '🗑️ deleteSiteNoteAction (local)',
        input.id,
        'for site',
        input.siteId,
      );
    }
    return Promise.resolve(input);
  } else {
    if (syncDebugEnabled) {
      console.log('🗑️ deleteSiteNoteAction (remote)', input.id);
    }
    return siteService.deleteSiteNote(input);
  }
};

const findSiteNote = (state: AppState, noteId: string): SiteNote => {
  for (const site of Object.values(state.site.sites)) {
    if (noteId in site.notes) {
      return site.notes[noteId];
    }
  }
  throw new Error(`Site note ${noteId} not found`);
};
