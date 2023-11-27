/*
 * Copyright © ${YEAR} Technology Matters
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
import {createContext, useContext, useEffect, useMemo, useState} from 'react';
import haversine from 'haversine';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {GEOSPATIAL_CONTEXT_USER_DISTANCE_CACHE} from 'terraso-mobile-client/constants';
import {AppState, useSelector} from 'terraso-mobile-client/model/store';

type GeospatialInfo = {
  /* list of site IDs, sorted with respect to user's current location */
  siteDistances: Record<string, number> | null;
};

/**
 * Context that provides information about geospatial objects
 */
const GeospatialContext = createContext<GeospatialInfo>({
  siteDistances: null,
});

export const useGeospatialContext = () => {
  return useContext(GeospatialContext);
};

type ProviderProps = {
  sites: (Coords & {id: string})[];
  userLocation: Coords | null;
} & React.PropsWithChildren;

export const GeospatialProvider = ({children}: React.PropsWithChildren) => {
  const sites = useSelector((state: AppState) => state.site.sites);
  const userLocation = useSelector(state => state.map.userLocation);

  const userCoords = useMemo(
    () => userLocation && userLocation.coords,
    [userLocation],
  );

  return (
    <GeospatialProviderInjected
      sites={Object.values(sites)}
      userLocation={userCoords}>
      {children}
    </GeospatialProviderInjected>
  );
};

export const GeospatialProviderInjected = ({
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
      haversine(userLocation, lastUserLocation) >
      GEOSPATIAL_CONTEXT_USER_DISTANCE_CACHE
    ) {
      setLastUserLocation(userLocation);
    }
  }, [userLocation, lastUserLocation, setLastUserLocation]);

  const siteDistances = useMemo(() => {
    if (!lastUserLocation) {
      return null;
    }
    return Object.fromEntries(
      sites
        .map(({latitude, longitude, id}) => ({
          id,
          location: {latitude, longitude},
        }))
        .map(({id, location}) => [id, haversine(location, lastUserLocation)]),
    );
  }, [sites, lastUserLocation]);

  return (
    <GeospatialContext.Provider value={{siteDistances}}>
      {children}
    </GeospatialContext.Provider>
  );
};
