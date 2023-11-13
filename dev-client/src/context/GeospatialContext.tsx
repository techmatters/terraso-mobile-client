import {createContext, useMemo} from 'react';
import haversine from 'haversine';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';

type GeospatialInfo = {
  /* list of site IDs, sorted with respect to user's current location */
  sortedSites: string[] | null;
};

/**
 * Context that provides information about geospatial objects
 */
export const GeospatialContext = createContext<GeospatialInfo>({
  sortedSites: null,
});

type ProviderProps = {
  sites: (Coords & {id: string})[];
  userLocation: Coords | null;
} & React.PropsWithChildren;

export const GeospatialProvider = ({
  sites,
  userLocation,
  children,
}: ProviderProps) => {
  const siteDistances = useMemo(() => {
    if (!userLocation) {
      return null;
    }
    return sites
      .map(({latitude, longitude, id}) => ({
        id,
        location: {latitude, longitude},
      }))
      .map(({id, location}) => ({
        d: haversine(location, userLocation),
        siteId: id,
      }))
      .sort(({d: d1}, {d: d2}) => d1 - d2)
      .map(({siteId}) => siteId);
  }, [sites, userLocation]);

  return (
    <GeospatialContext.Provider value={{sortedSites: siteDistances}}>
      {children}
    </GeospatialContext.Provider>
  );
};
