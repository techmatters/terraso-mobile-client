import {createContext, useEffect, useMemo, useState} from 'react';
import haversine from 'haversine';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {USER_DISTANCE_CONTEXT_CACHE} from 'terraso-mobile-client/constants';

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
  const [lastUserLocation, setLastUserLocation] = useState<Coords | null>(
    userLocation,
  );

  useEffect(() => {
    if (!lastUserLocation) {
      if (userLocation) {
        setLastUserLocation(userLocation);
      }
      return;
    }
    if (!userLocation) {
      setLastUserLocation(null);
      return;
    }
    if (
      haversine(userLocation, lastUserLocation) > USER_DISTANCE_CONTEXT_CACHE
    ) {
      setLastUserLocation(userLocation);
    }
  }, [userLocation, lastUserLocation, setLastUserLocation]);

  const siteDistances = useMemo(() => {
    if (!lastUserLocation) {
      return null;
    }
    return sites
      .map(({latitude, longitude, id}) => ({
        id,
        location: {latitude, longitude},
      }))
      .map(({id, location}) => ({
        d: haversine(location, lastUserLocation),
        siteId: id,
      }))
      .sort(({d: d1}, {d: d2}) => d1 - d2)
      .map(({siteId}) => siteId);
  }, [sites, lastUserLocation]);

  return (
    <GeospatialContext.Provider value={{sortedSites: siteDistances}}>
      {children}
    </GeospatialContext.Provider>
  );
};
