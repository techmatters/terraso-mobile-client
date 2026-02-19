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

import {Site, SiteNote} from 'terraso-client-shared/site/siteTypes';

import {diffFields} from 'terraso-mobile-client/model/soilData/actions/soilDataDiff';

const SITE_UPDATE_FIELDS: (keyof Site)[] = [
  'name',
  'latitude',
  'longitude',
  'elevation',
  'privacy',
];

export const getChangedSiteFields = (
  curr: Site,
  prev?: Site,
): Partial<Site> => {
  return diffFields(SITE_UPDATE_FIELDS, curr, prev);
};

export const getNewNotes = (
  curr: Record<string, SiteNote>,
  prev?: Record<string, SiteNote>,
): SiteNote[] => {
  return Object.values(curr).filter(note => !prev || !(note.id in prev));
};

export const getUpdatedNotes = (
  curr: Record<string, SiteNote>,
  prev?: Record<string, SiteNote>,
): SiteNote[] => {
  if (!prev) {
    return [];
  }
  return Object.values(curr).filter(
    note => note.id in prev && note.content !== prev[note.id].content,
  );
};

export const getDeletedNotes = (
  curr: Record<string, SiteNote>,
  prev?: Record<string, SiteNote>,
): SiteNote[] => {
  if (!prev) {
    return [];
  }
  return Object.values(prev).filter(note => !(note.id in curr));
};
