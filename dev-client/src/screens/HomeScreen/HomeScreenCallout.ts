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

import {Site} from 'terraso-client-shared/site/siteSlice';
import {Coords} from 'terraso-client-shared/types';

export type CalloutState =
  | {
      kind: 'site';
      siteId: string;
    }
  | {
      kind: 'location';
      coords: Coords;
      isCurrentLocation: boolean;
    }
  | {
      kind: 'site_cluster';
      siteIds: string[];
      coords: Coords;
    }
  | {kind: 'none'};

export function siteCallout(siteId: string): CalloutState {
  return {kind: 'site', siteId};
}

export function siteClusterCallout(
  coords: Coords,
  siteIds: Iterable<string>,
): CalloutState {
  return {kind: 'site_cluster', coords, siteIds: Array.from(siteIds)};
}

export function locationCallout(
  coords: Coords,
  isCurrentLocation: boolean = false,
): CalloutState {
  return {kind: 'location', coords, isCurrentLocation};
}

export function noneCallout(): CalloutState {
  return {kind: 'none'};
}

export function getCalloutCoords(
  state: CalloutState,
  sites: Record<string, Site>,
): Coords | null {
  switch (state.kind) {
    case 'site':
      return getCalloutSite(state, sites);
    case 'location':
      return state.coords;
    case 'site_cluster':
      return state.coords;
    case 'none':
      return null;
  }
}

export function getCalloutSite(
  state: CalloutState,
  sites: Record<string, Site>,
): Site | null {
  return state.kind === 'site' && state.siteId in sites
    ? sites[state.siteId]
    : null;
}

export function getCalloutSites(
  state: CalloutState,
  sites: Record<string, Site>,
): Record<string, Site> {
  switch (state.kind) {
    case 'site':
      const site = getCalloutSite(state, sites);
      return site == null ? {} : Object.fromEntries([[state.siteId, site]]);
    case 'site_cluster':
      const presentSiteIds = state.siteIds.filter(siteId => siteId in sites);
      return Object.fromEntries(
        presentSiteIds.map(siteId => [siteId, sites[siteId]]),
      );
    default:
      return {};
  }
}
