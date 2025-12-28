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

import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform, StyleSheet, View} from 'react-native';

import Mapbox, {type Camera, type MapView} from '@rnmapbox/maps';

import {Coords} from 'terraso-client-shared/types';

// Local coordinate conversion to avoid circular dependency with StaticMapView
const coordsToPosition = ({latitude, longitude}: Coords): [number, number] => [
  longitude,
  latitude,
];

/**
 * MapSnapshotService - Singleton MapView for capturing map snapshots on Android.
 *
 * On Android, multiple simultaneous MapViews don't reliably fire their load
 * callbacks, especially when components mount/unmount rapidly. This service
 * provides a single, always-mounted MapView that processes snapshot requests
 * one at a time.
 *
 * Usage:
 * 1. Mount <MapSnapshotService /> once at the app root level
 * 2. Call requestMapSnapshot(coords, zoomLevel) to get a snapshot
 * 3. The returned promise resolves with a base64 data URI
 */

type SnapshotRequest = {
  id: number;
  coords: Coords;
  zoomLevel: number;
  resolve: (uri: string) => void;
  reject: (error: Error) => void;
};

// Module-level state for the singleton pattern
let serviceInstance: {
  processRequest: (request: SnapshotRequest) => void;
} | null = null;

const pendingRequests: SnapshotRequest[] = [];
let isProcessing = false;
let requestIdCounter = 0;

/**
 * Request a map snapshot for the given coordinates.
 * Returns a promise that resolves with a base64 data URI of the map image.
 */
export const requestMapSnapshot = (
  coords: Coords,
  zoomLevel: number = 15,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const request: SnapshotRequest = {
      id: ++requestIdCounter,
      coords,
      zoomLevel,
      resolve,
      reject,
    };

    if (serviceInstance && !isProcessing) {
      // Service is ready and idle - process immediately
      isProcessing = true;
      serviceInstance.processRequest(request);
    } else {
      // Queue the request
      pendingRequests.push(request);
    }
  });
};

const processNextRequest = () => {
  if (pendingRequests.length === 0) {
    isProcessing = false;
    return;
  }

  const next = pendingRequests.shift()!;
  isProcessing = true;

  if (serviceInstance) {
    serviceInstance.processRequest(next);
  } else {
    // Service not ready - put request back and wait
    pendingRequests.unshift(next);
    isProcessing = false;
  }
};

export const MapSnapshotService = () => {
  const mapRef = useRef<MapView>(null);
  const cameraRef = useRef<Camera>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Use refs for synchronous access in callbacks
  const currentRequestRef = useRef<SnapshotRequest | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCapturingRef = useRef(false);
  // Track the request ID we're waiting for to avoid processing stale idle events
  const expectedRequestIdRef = useRef<number | null>(null);

  // Process a snapshot request by moving the camera
  const processRequest = useCallback(
    (request: SnapshotRequest) => {
      if (!isMapReady || !cameraRef.current) {
        // Map not ready yet - queue the request
        pendingRequests.unshift(request);
        isProcessing = false;
        return;
      }

      // Set up tracking BEFORE moving camera
      currentRequestRef.current = request;
      expectedRequestIdRef.current = request.id;
      isCapturingRef.current = false;

      // Move camera to new position
      cameraRef.current.setCamera({
        centerCoordinate: coordsToPosition(request.coords),
        zoomLevel: request.zoomLevel,
        animationMode: 'none',
        animationDuration: 0,
      });

      // Set timeout - if map doesn't settle within 10 seconds, reject and continue
      timeoutRef.current = setTimeout(() => {
        if (
          currentRequestRef.current &&
          currentRequestRef.current.id === request.id
        ) {
          request.reject(new Error('Map idle timeout'));
          currentRequestRef.current = null;
          expectedRequestIdRef.current = null;
          processNextRequest();
        }
      }, 10000);
    },
    [isMapReady],
  );

  // Register this instance as the service
  useEffect(() => {
    serviceInstance = {processRequest};

    return () => {
      serviceInstance = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [processRequest]);

  // When map is ready, start processing any pending requests
  useEffect(() => {
    if (isMapReady && pendingRequests.length > 0 && !isProcessing) {
      processNextRequest();
    }
  }, [isMapReady]);

  // Called when the map style first finishes loading
  const onDidFinishLoadingMap = useCallback(() => {
    setIsMapReady(true);
  }, []);

  // Called when the map becomes idle after camera movements
  const onMapIdle = useCallback(async () => {
    const request = currentRequestRef.current;
    const expectedId = expectedRequestIdRef.current;

    // Only process if we have a pending request and haven't already captured
    if (!request || expectedId === null || isCapturingRef.current) {
      return;
    }

    // Verify this is the request we're expecting
    if (request.id !== expectedId) {
      return;
    }

    // Mark as capturing to prevent duplicate captures
    isCapturingRef.current = true;

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!mapRef.current) {
      request.reject(new Error('Map ref not available'));
      currentRequestRef.current = null;
      expectedRequestIdRef.current = null;
      processNextRequest();
      return;
    }

    try {
      // Capture snapshot as base64 data URI
      const uri = await mapRef.current.takeSnap(false);
      request.resolve(uri);
    } catch (e) {
      request.reject(e as Error);
    }

    currentRequestRef.current = null;
    expectedRequestIdRef.current = null;
    processNextRequest();
  }, []);

  // Only render on Android - iOS doesn't have this issue
  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        ref={mapRef}
        localizeLabels={true}
        style={styles.map}
        styleURL={Mapbox.StyleURL.Satellite}
        scaleBarEnabled={false}
        logoEnabled={false}
        zoomEnabled={false}
        scrollEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        attributionEnabled={false}
        pointerEvents="none"
        onDidFinishLoadingMap={onDidFinishLoadingMap}
        onMapIdle={onMapIdle}>
        <Mapbox.Camera ref={cameraRef} />
      </Mapbox.MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // Render behind all app content instead of off-screen.
    // Off-screen positioning (left: -9999) prevents Android from processing the map.
    top: 0,
    left: 0,
    width: 200,
    height: 200,
    zIndex: -1,
    opacity: 0.01, // Nearly invisible but still rendered by GPU
  },
  map: {
    flex: 1,
  },
});
