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

import {createRef, useCallback, useEffect, useRef, useState} from 'react';
import {Platform, StyleSheet, View} from 'react-native';

import Mapbox, {type Camera, type MapView} from '@rnmapbox/maps';

import {Coords} from 'terraso-client-shared/types';

// Local coordinate conversion to avoid circular dependency with StaticMapView
const coordsToPosition = ({latitude, longitude}: Coords): [number, number] => [
  longitude,
  latitude,
];

/**
 * MapSnapshotService - Multiple fixed-size MapViews for capturing map snapshots on Android.
 *
 * On Android, multiple simultaneous MapViews don't reliably fire their load
 * callbacks, especially when components mount/unmount rapidly. This service
 * provides always-mounted MapViews (one per unique size) that process snapshot
 * requests one at a time.
 *
 * Usage:
 * 1. Mount <MapSnapshotService /> once at the app root level
 * 2. Call requestMapSnapshot(coords, zoomLevel, width, height) to get a snapshot
 * 3. The returned promise resolves with a base64 data URI
 */

type SnapshotRequest = {
  id: number;
  coords: Coords;
  zoomLevel: number;
  width: number;
  height: number;
  resolve: (uri: string) => void;
  reject: (error: Error) => void;
  startTime: number;
  cancelled: boolean;
};

type SizeKey = string; // "WIDTHxHEIGHT"
const sizeKey = (w: number, h: number): SizeKey => `${w}x${h}`;

// Module-level state for the singleton pattern
let serviceInstance: {
  processRequest: (request: SnapshotRequest) => void;
  registerSize: (width: number, height: number) => void;
  isSizeReady: (width: number, height: number) => boolean;
} | null = null;

const pendingRequests: SnapshotRequest[] = [];
let isProcessing = false;
let requestIdCounter = 0;
const sessionStart = Date.now();
const T = () => Date.now() - sessionStart;

export type SnapshotHandle = {
  promise: Promise<string>;
  cancel: () => void;
};

/**
 * Request a map snapshot for the given coordinates.
 * Returns a handle with:
 * - promise: resolves with a base64 data URI of the map image
 * - cancel: call to mark the request as cancelled (skipped when dequeued)
 */
export const requestMapSnapshot = (
  coords: Coords,
  zoomLevel: number = 15,
  width: number = 200,
  height: number = 200,
): SnapshotHandle => {
  let request: SnapshotRequest;

  const promise = new Promise<string>((resolve, reject) => {
    request = {
      id: ++requestIdCounter,
      coords,
      zoomLevel,
      width,
      height,
      resolve,
      reject,
      startTime: Date.now(),
      cancelled: false,
    };

    // Register this size so a MapView is created for it
    if (serviceInstance) {
      serviceInstance.registerSize(width, height);
    }

    if (serviceInstance && !isProcessing) {
      // Check if this size's MapView is ready
      if (serviceInstance.isSizeReady(width, height)) {
        isProcessing = true;
        console.log(
          `[MapSnapshot #${request.id}] T=${T()} Processing immediately (${width}x${height})`,
        );
        serviceInstance.processRequest(request);
      } else {
        console.log(
          `[MapSnapshot #${request.id}] T=${T()} Queued - waiting for ${width}x${height} MapView to be ready`,
        );
        pendingRequests.push(request);
      }
    } else {
      console.log(
        `[MapSnapshot #${request.id}] T=${T()} Queued (${pendingRequests.length + 1} in queue)`,
      );
      pendingRequests.push(request);
    }
  });

  const cancel = () => {
    request.cancelled = true;
  };

  return {promise, cancel};
};

const processNextRequest = () => {
  // Skip any cancelled requests at the front of the queue
  while (pendingRequests.length > 0 && pendingRequests[0].cancelled) {
    const skipped = pendingRequests.shift()!;
    console.log(`[MapSnapshot #${skipped.id}] T=${T()} Skipped (cancelled)`);
  }

  if (pendingRequests.length === 0) {
    isProcessing = false;
    return;
  }

  // Find the first request whose size is ready
  const readyIndex = pendingRequests.findIndex(
    req =>
      serviceInstance?.isSizeReady(req.width, req.height) && !req.cancelled,
  );

  if (readyIndex === -1) {
    // No ready requests - wait for a MapView to become ready
    isProcessing = false;
    return;
  }

  const next = pendingRequests.splice(readyIndex, 1)[0];
  isProcessing = true;

  if (serviceInstance) {
    const waitTime = Date.now() - next.startTime;
    console.log(
      `[MapSnapshot #${next.id}] T=${T()} Dequeued (waited ${waitTime}ms, ${pendingRequests.length} remaining)`,
    );
    serviceInstance.processRequest(next);
  } else {
    pendingRequests.unshift(next);
    isProcessing = false;
  }
};

// Individual MapView component for a specific size
type SizedMapViewProps = {
  width: number;
  height: number;
  onReady: (sizeKey: SizeKey) => void;
  onFrameFullyRendered: (sizeKey: SizeKey) => void;
  mapRef: React.RefObject<MapView | null>;
  cameraRef: React.RefObject<Camera | null>;
};

const SizedMapView = ({
  width,
  height,
  onReady,
  onFrameFullyRendered,
  mapRef,
  cameraRef,
}: SizedMapViewProps) => {
  const key = sizeKey(width, height);

  const handleDidFinishLoadingMap = useCallback(() => {
    console.log(`[MapSnapshot] MapView ${key} ready`);
    onReady(key);
  }, [key, onReady]);

  const handleDidFinishRenderingFrameFully = useCallback(() => {
    onFrameFullyRendered(key);
  }, [key, onFrameFullyRendered]);

  return (
    <View style={[styles.container, {width, height}]}>
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
        onDidFinishLoadingMap={handleDidFinishLoadingMap}
        onDidFinishRenderingFrameFully={handleDidFinishRenderingFrameFully}>
        <Mapbox.Camera ref={cameraRef} />
      </Mapbox.MapView>
    </View>
  );
};

export const MapSnapshotService = () => {
  // Track all unique sizes we need MapViews for
  const [sizes, setSizes] = useState<Array<{width: number; height: number}>>(
    [],
  );
  // Track which sizes have loaded and are ready
  const [readySizes, setReadySizes] = useState<Set<SizeKey>>(new Set());

  // Refs for each size's MapView and Camera
  const mapRefs = useRef<Map<SizeKey, React.RefObject<MapView | null>>>(
    new Map(),
  );
  const cameraRefs = useRef<Map<SizeKey, React.RefObject<Camera | null>>>(
    new Map(),
  );

  // Current request being processed
  const currentRequestRef = useRef<SnapshotRequest | null>(null);
  const expectedRequestIdRef = useRef<number | null>(null);
  const isCapturingRef = useRef(false);
  const cameraMoveTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleCountRef = useRef(0);

  // Register a new size (creates a MapView for it if needed)
  const registerSize = useCallback((width: number, height: number) => {
    setSizes(prev => {
      const exists = prev.some(s => s.width === width && s.height === height);
      if (exists) {
        return prev;
      }
      console.log(`[MapSnapshot] Registering new size: ${width}x${height}`);
      return [...prev, {width, height}];
    });
  }, []);

  // Check if a size's MapView is ready
  const isSizeReady = useCallback(
    (width: number, height: number) => {
      return readySizes.has(sizeKey(width, height));
    },
    [readySizes],
  );

  // Called when a MapView finishes loading
  const handleMapReady = useCallback((key: SizeKey) => {
    setReadySizes(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  // Capture snapshot using the appropriate MapView
  const captureSnapshot = useCallback(async () => {
    const request = currentRequestRef.current;
    if (!request) {
      processNextRequest();
      return;
    }

    const key = sizeKey(request.width, request.height);
    const mapRef = mapRefs.current.get(key);

    if (!mapRef?.current) {
      console.log(
        `[MapSnapshot #${request.id}] T=${T()} Error: MapView ref not available for ${key}`,
      );
      request.reject(new Error('Map ref not available'));
      currentRequestRef.current = null;
      expectedRequestIdRef.current = null;
      processNextRequest();
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const idleTime = Date.now() - cameraMoveTimeRef.current;
    console.log(
      `[MapSnapshot #${request.id}] T=${T()} Capturing (${idleTime}ms since camera move)...`,
    );

    try {
      const snapStart = Date.now();
      const uri = await mapRef.current.takeSnap(false);
      const snapTime = Date.now() - snapStart;
      const totalTime = Date.now() - request.startTime;
      const uriLength = uri.length;
      const isLikelyBlack = uriLength < 5000;
      console.log(
        `[MapSnapshot #${request.id}] T=${T()} Done (idle=${idleTime}ms, snap=${snapTime}ms, total=${totalTime}ms, size=${uriLength}${isLikelyBlack ? ' LIKELY BLACK!' : ''})`,
      );
      request.resolve(uri);
    } catch (e) {
      console.log(`[MapSnapshot #${request.id}] T=${T()} Snap error: ${e}`);
      request.reject(e as Error);
    }

    currentRequestRef.current = null;
    expectedRequestIdRef.current = null;
    isCapturingRef.current = false;
    processNextRequest();
  }, []);

  // Called when any MapView finishes rendering a frame fully
  const handleFrameFullyRendered = useCallback(
    (key: SizeKey) => {
      const request = currentRequestRef.current;
      const expectedId = expectedRequestIdRef.current;

      if (!request || expectedId === null) {
        return;
      }

      if (request.id !== expectedId) {
        return;
      }

      // Check this is the right MapView for our request
      const requestKey = sizeKey(request.width, request.height);
      if (key !== requestKey) {
        return;
      }

      if (isCapturingRef.current) {
        return;
      }

      idleCountRef.current++;
      const renderTime = Date.now() - cameraMoveTimeRef.current;
      console.log(
        `[MapSnapshot #${request.id}] T=${T()} onDidFinishRenderingFrameFully #${idleCountRef.current} (${renderTime}ms since camera move, size=${key})`,
      );

      isCapturingRef.current = true;
      console.log(
        `[MapSnapshot #${request.id}] T=${T()} Frame fully rendered, capturing...`,
      );
      captureSnapshot();
    },
    [captureSnapshot],
  );

  // Process a snapshot request
  const processRequest = useCallback((request: SnapshotRequest) => {
    const key = sizeKey(request.width, request.height);
    const cameraRef = cameraRefs.current.get(key);

    if (!cameraRef?.current) {
      console.log(
        `[MapSnapshot #${request.id}] T=${T()} Error: Camera ref not available for ${key}`,
      );
      pendingRequests.unshift(request);
      isProcessing = false;
      return;
    }

    currentRequestRef.current = request;
    expectedRequestIdRef.current = request.id;
    isCapturingRef.current = false;
    idleCountRef.current = 0;
    cameraMoveTimeRef.current = Date.now();

    console.log(
      `[MapSnapshot #${request.id}] T=${T()} Moving camera (${request.width}x${request.height})...`,
    );

    cameraRef.current.setCamera({
      centerCoordinate: coordsToPosition(request.coords),
      zoomLevel: request.zoomLevel,
      animationMode: 'none',
      animationDuration: 0,
    });

    // Timeout fallback
    timeoutRef.current = setTimeout(() => {
      if (
        currentRequestRef.current &&
        currentRequestRef.current.id === request.id
      ) {
        const elapsed = Date.now() - request.startTime;
        console.log(
          `[MapSnapshot #${request.id}] TIMEOUT after ${elapsed}ms total`,
        );
        request.reject(new Error('Map idle timeout'));
        currentRequestRef.current = null;
        expectedRequestIdRef.current = null;
        processNextRequest();
      }
    }, 10000);
  }, []);

  // Register the service instance
  useEffect(() => {
    serviceInstance = {processRequest, registerSize, isSizeReady};

    return () => {
      serviceInstance = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [processRequest, registerSize, isSizeReady]);

  // When a new size becomes ready, try to process pending requests
  useEffect(() => {
    if (readySizes.size > 0 && pendingRequests.length > 0 && !isProcessing) {
      processNextRequest();
    }
  }, [readySizes]);

  // Ensure refs exist for each size
  useEffect(() => {
    sizes.forEach(({width, height}) => {
      const key = sizeKey(width, height);
      if (!mapRefs.current.has(key)) {
        mapRefs.current.set(key, createRef<MapView>());
      }
      if (!cameraRefs.current.has(key)) {
        cameraRefs.current.set(key, createRef<Camera>());
      }
    });
  }, [sizes]);

  // Only render on Android
  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <>
      {sizes.map(({width, height}) => {
        const key = sizeKey(width, height);
        // Get or create refs for this size
        if (!mapRefs.current.has(key)) {
          mapRefs.current.set(key, createRef<MapView>());
        }
        if (!cameraRefs.current.has(key)) {
          cameraRefs.current.set(key, createRef<Camera>());
        }
        return (
          <SizedMapView
            key={key}
            width={width}
            height={height}
            onReady={handleMapReady}
            onFrameFullyRendered={handleFrameFullyRendered}
            mapRef={mapRefs.current.get(key)!}
            cameraRef={cameraRefs.current.get(key)!}
          />
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: -1,
    opacity: 0.01,
  },
  map: {
    flex: 1,
  },
});
