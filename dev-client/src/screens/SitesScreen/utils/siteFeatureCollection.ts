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

import {Site} from 'terraso-client-shared/site/siteTypes';

export const siteFeatureCollection = (
  sites: Pick<Site, 'id' | 'latitude' | 'longitude'>[],
): GeoJSON.FeatureCollection<GeoJSON.Point> => {
  const badSites = sites.filter(
    site =>
      typeof site.latitude !== 'number' ||
      typeof site.longitude !== 'number' ||
      isNaN(site.latitude) ||
      isNaN(site.longitude),
  );
  if (badSites.length > 0) {
    console.error(
      '🗺️ siteFeatureCollection: sites with bad coordinates:',
      badSites.map(s => ({id: s.id, lat: s.latitude, lon: s.longitude})),
    );
  }

  return {
    type: 'FeatureCollection',
    features: sites
      .filter(
        site =>
          typeof site.latitude === 'number' &&
          typeof site.longitude === 'number' &&
          !isNaN(site.latitude) &&
          !isNaN(site.longitude),
      )
      .map(site => ({
        type: 'Feature' as const,
        id: site.id,
        properties: {},
        geometry: {
          type: 'Point' as const,
          coordinates: [site.longitude, site.latitude],
        },
      })),
  };
};
