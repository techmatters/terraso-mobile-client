import {Site} from 'terraso-client-shared/site/siteSlice';

export const siteFeatureCollection = (
  sites: Pick<Site, 'id' | 'latitude' | 'longitude'>[],
): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
  type: 'FeatureCollection',
  features: sites.map(site => ({
    type: 'Feature',
    id: site.id,
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [site.longitude, site.latitude],
    },
  })),
});
