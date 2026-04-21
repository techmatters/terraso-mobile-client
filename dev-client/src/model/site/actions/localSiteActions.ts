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

import {v4 as uuidv4} from 'uuid';

import {Site, SiteNote} from 'terraso-client-shared/site/siteTypes';

import {AppState} from 'terraso-mobile-client/store';

export type SiteAddInput = Pick<Site, 'name' | 'latitude' | 'longitude'> &
  Partial<Pick<Site, 'elevation' | 'privacy' | 'projectId'>>;

export type SiteUpdateInput = Pick<Site, 'id'> &
  Partial<
    Pick<Site, 'name' | 'latitude' | 'longitude' | 'elevation' | 'privacy'>
  >;

export type SiteNoteAddInput = Pick<SiteNote, 'siteId' | 'content'>;

export type SiteNoteUpdateInput = Pick<SiteNote, 'id' | 'content'>;

export const SITE_UPDATE_FIELDS: (keyof SiteUpdateInput & keyof Site)[] = [
  'name',
  'latitude',
  'longitude',
  'elevation',
  'privacy',
];

export const addSite = (input: SiteAddInput, state: AppState): Site => {
  const currentUser = state.account.currentUser.data;
  return {
    id: uuidv4(),
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    elevation: input.elevation ?? null,
    privacy: input.privacy ?? 'PRIVATE',
    projectId: input.projectId ?? undefined,
    ownerId: currentUser?.id,
    archived: false,
    updatedAt: new Date().toISOString(),
    notes: {},
  };
};

export const updateSite = (input: SiteUpdateInput, site: Site): Site => {
  const updates: Partial<Site> = {};
  for (const field of SITE_UPDATE_FIELDS) {
    const value = input[field];
    if (value !== undefined) {
      Object.assign(updates, {[field]: value});
    }
  }
  return {
    ...site,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
};

export const addSiteNote = (
  input: SiteNoteAddInput,
  state: AppState,
): SiteNote => {
  const currentUser = state.account.currentUser.data;
  return {
    id: uuidv4(),
    siteId: input.siteId,
    content: input.content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorId: currentUser?.id ?? '',
    authorFirstName: currentUser?.firstName ?? '',
    authorLastName: currentUser?.lastName ?? '',
  };
};

export const updateSiteNote = (
  input: SiteNoteUpdateInput,
  note: SiteNote,
): SiteNote => {
  return {
    ...note,
    content: input.content,
    updatedAt: new Date().toISOString(),
  };
};
