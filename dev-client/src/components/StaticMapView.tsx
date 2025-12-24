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

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Image,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import Mapbox, {type Camera, type MapView} from '@rnmapbox/maps';

import {Coords} from 'terraso-client-shared/types';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
} from 'terraso-mobile-client/constants';

// Queue system for Android - only render one MapView at a time.
// On Android, multiple simultaneous off-screen MapViews don't reliably fire callbacks.
// iOS doesn't need this (isMyTurn starts true, skipping the queue entirely).
type QueueEntry = {callback: () => void; cancelled: boolean};
const mapLoadQueue: QueueEntry[] = [];
let isProcessingQueue = false;

const enqueueMapLoad = (callback: () => void): QueueEntry => {
  const entry: QueueEntry = {callback, cancelled: false};
  mapLoadQueue.push(entry);
  processQueue();
  return entry;
};

const processQueue = () => {
  if (isProcessingQueue) {
    return;
  }

  while (mapLoadQueue.length > 0) {
    const next = mapLoadQueue.shift()!;

    // Skip cancelled entries (component unmounted before its turn)
    if (next.cancelled) {
      continue;
    }

    isProcessingQueue = true;
    next.callback();
    return;
  }
};

const markMapLoadComplete = () => {
  isProcessingQueue = false;
  processQueue();
};

// Extract Position type from Camera's fitBounds method (Position is [longitude, latitude])
type Position = Parameters<Camera['fitBounds']>[0];

const coordsRegex = /^(-?\d+\.\d+)\s*[, ]\s*(-?\d+\.\d+)$/;
export type CoordsParseErrorReason =
  | 'COORDS_PARSE'
  | 'LATITUDE_PARSE'
  | 'LONGITUDE_PARSE'
  | 'LATITUDE_MIN'
  | 'LATITUDE_MAX'
  | 'LONGITUDE_MIN'
  | 'LONGITUDE_MAX';

export class CoordsParseError extends Error {
  constructor(reason: CoordsParseErrorReason) {
    super(reason);
  }
}

export interface CoordsParseError {
  message: CoordsParseErrorReason;
}

export const parseCoords = (coords: string) => {
  const match = coords.trim().match(coordsRegex);
  if (!match) {
    throw new CoordsParseError('COORDS_PARSE');
  }

  const [latitude, longitude] = [match[1], match[2]].map(Number.parseFloat);
  if (Number.isNaN(latitude)) {
    throw new CoordsParseError('LATITUDE_PARSE');
  } else if (Number.isNaN(longitude)) {
    throw new CoordsParseError('LONGITUDE_PARSE');
  } else if (latitude < LATITUDE_MIN) {
    throw new CoordsParseError('LATITUDE_MIN');
  } else if (latitude > LATITUDE_MAX) {
    throw new CoordsParseError('LATITUDE_MAX');
  } else if (longitude < LONGITUDE_MIN) {
    throw new CoordsParseError('LONGITUDE_MIN');
  } else if (longitude > LONGITUDE_MAX) {
    throw new CoordsParseError('LONGITUDE_MAX');
  } else {
    return {latitude, longitude};
  }
};

export const coordsToPosition = ({latitude, longitude}: Coords): Position => [
  longitude,
  latitude,
];
export const positionToCoords = (
  position: Position | GeoJSON.Position,
): Coords => ({
  latitude: position[1],
  longitude: position[0],
});

type Props = {
  coords: Coords;
  zoomLevel?: number;
  style?: StyleProp<ViewStyle>;
  displayCenterMarker?: boolean;
};

export const StaticMapView = ({
  coords,
  zoomLevel = 15,
  style,
  displayCenterMarker,
}: Props) => {
  const mapRef = useRef<MapView>(null);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  // On Android, wait for queue turn before rendering MapView
  const [isMyTurn, setIsMyTurn] = useState(Platform.OS !== 'android');

  const cameraSettings = useMemo(
    () =>
      ({
        centerCoordinate: coordsToPosition(coords),
        zoomLevel: zoomLevel,
        animationMode: 'none',
        animationDuration: 0,
      }) as const,
    [coords, zoomLevel],
  );

  // Track our queue entry to cancel it on unmount
  const queueEntryRef = useRef<QueueEntry | null>(null);
  // Track current state in refs for cleanup (closures have stale values)
  const isMyTurnRef = useRef(isMyTurn);
  const snapshotUriRef = useRef(snapshotUri);
  isMyTurnRef.current = isMyTurn;
  snapshotUriRef.current = snapshotUri;

  // On Android, enqueue this component to wait its turn
  useEffect(() => {
    if (Platform.OS === 'android' && !snapshotUri && !isMyTurn) {
      queueEntryRef.current = enqueueMapLoad(() => {
        setIsMyTurn(true);
        isMyTurnRef.current = true;
      });
    }
  }, [snapshotUri, isMyTurn]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (Platform.OS === 'android') {
        if (queueEntryRef.current && !queueEntryRef.current.cancelled) {
          queueEntryRef.current.cancelled = true;
        }
        if (isMyTurnRef.current && !snapshotUriRef.current) {
          markMapLoadComplete();
        }
      }
    };
  }, []);

  // Capture the map as an image once it's loaded to avoid Android layer issues.
  // Using onDidFinishLoadingMap instead of onMapIdle for more reliable firing.
  // Using false returns base64 data URI (no temp files written to disk).
  const onDidFinishLoadingMap = useCallback(async () => {
    if (!mapRef.current) {
      if (Platform.OS === 'android') {
        markMapLoadComplete();
      }
      return;
    }
    try {
      const uri = await mapRef.current.takeSnap(false);
      setSnapshotUri(uri);
    } catch {
      // Ignore snapshot errors
    }
    if (Platform.OS === 'android') {
      markMapLoadComplete();
    }
  }, []);

  const shouldRenderMap = !snapshotUri && isMyTurn;

  return (
    <View style={[style, styles.container]}>
      {shouldRenderMap && (
        <View style={styles.offscreen}>
          <Mapbox.MapView
            ref={mapRef}
            localizeLabels={true}
            style={styles.fill}
            styleURL={Mapbox.StyleURL.Satellite}
            scaleBarEnabled={false}
            logoEnabled={false}
            zoomEnabled={false}
            scrollEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            attributionEnabled={false}
            pointerEvents="none"
            onDidFinishLoadingMap={onDidFinishLoadingMap}>
            <Mapbox.Camera defaultSettings={cameraSettings} />
          </Mapbox.MapView>
        </View>
      )}
      {snapshotUri && (
        <>
          <Image source={{uri: snapshotUri}} style={styles.fill} />
          {displayCenterMarker && (
            <View style={styles.markerContainer}>
              <Icon name="location-on" color="secondary.main" />
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  fill: {
    flex: 1,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -12}, {translateY: -24}],
  },
});
