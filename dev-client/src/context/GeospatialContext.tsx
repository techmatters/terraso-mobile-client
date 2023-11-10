import {createContext, useMemo} from 'react';
import {useSelector} from 'terraso-mobile-client/model/store';
import haversine from 'haversine';

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

export const GeospatialProvider = ({children}: React.PropsWithChildren) => {
  const sites = useSelector(state => state.site.sites);
  const userLocation = useSelector(state => state.map.userLocation.coords);

  const siteDistances = useMemo(() => {
    if (!userLocation) {
      return null;
    }
    return Object.values(sites)
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
