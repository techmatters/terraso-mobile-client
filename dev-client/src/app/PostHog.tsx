/*
 * Copyright © 2026 Technology Matters
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

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {AppState, Platform} from 'react-native';

import Constants from 'expo-constants';

import {NavigationContainerRef, useFocusEffect} from '@react-navigation/native';
import {PostHogProvider, usePostHog} from 'posthog-react-native';
import {isEnabled as isSessionReplayEnabled} from 'posthog-react-native-session-replay';

import {setPostHogInstance} from 'terraso-mobile-client/app/posthogInstance';
import {fetchSessionRecordingConfig} from 'terraso-mobile-client/app/sessionRecordingConfig';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {ConnectivityContext} from 'terraso-mobile-client/context/connectivity/ConnectivityContext';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';
import {useSelector} from 'terraso-mobile-client/store';

type Props = {
  children: ReactNode;
  navRef: NavigationContainerRef<any>;
};

// ---- Feature Flag Polling Context ----
// Provides a global polling mechanism that can be triggered from anywhere
// (e.g., screen focus, app foreground)
// Also provides access to banner message payload

type FeatureFlagPollingContextType = {
  trigger: () => void;
  bannerMessagePayload: any;
};

const FeatureFlagPollingContext =
  createContext<FeatureFlagPollingContextType | null>(null);

export function useFeatureFlagPollingContext() {
  const context = useContext(FeatureFlagPollingContext);
  return context;
}

// ---- User identification for PostHog ----
function UserIdentification() {
  const posthog = usePostHog();
  const currentUser = useSelector(state => state.account.currentUser?.data);

  // Set platform as a super property on mount (applies to all events)
  useEffect(() => {
    if (!posthog) return;
    posthog.register({
      platform: APP_CONFIG.environment || 'development',
    });
  }, [posthog]);

  useEffect(() => {
    if (!posthog) return;

    if (currentUser?.email) {
      // User is logged in - identify them with PostHog
      console.log('[PostHog] Identifying user:', currentUser.email);
      // Construct full name from firstName and lastName if available
      const fullName = [currentUser.firstName, currentUser.lastName]
        .filter(Boolean)
        .join(' ');

      const userProperties: Record<string, any> = {
        email: currentUser.email,
      };

      // Extract email domain
      const emailDomain = currentUser.email.split('@')[1];
      if (emailDomain) {
        userProperties.email_domain = emailDomain;
      }

      // Only add name if it exists
      if (fullName) {
        userProperties.name = fullName;
      }

      posthog.identify(
        currentUser.id || currentUser.email, // Use user ID if available, email as fallback
        userProperties,
      );
    } else {
      // User logged out or no user - reset to anonymous
      console.log('[PostHog] Resetting to anonymous user');
      posthog.reset();
    }
  }, [
    currentUser?.email,
    currentUser?.id,
    currentUser?.firstName,
    currentUser?.lastName,
    posthog,
  ]);

  return null;
}

// ---- Set global PostHog instance ----
function PostHogInstanceSetter() {
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog) {
      setPostHogInstance(posthog);
    }
  }, [posthog]);

  return null;
}

// ---- Background flush on app losing focus, reload flags on foreground ----
function PosthogLifecycle() {
  const posthog = usePostHog();

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        // App came to foreground - reload feature flags
        console.log(
          '[PostHog] App came to foreground, reloading feature flags',
        );
        posthog?.reloadFeatureFlags();
      } else {
        // App going to background - flush pending events
        posthog?.flush();
      }
    });
    return () => sub.remove();
  }, [posthog]);

  return null;
}

// ---- Track connectivity status as super property ----
function ConnectivityTracker() {
  const posthog = usePostHog();
  const {isOffline} = useContext(ConnectivityContext);

  // Clean up old is_offline property on mount
  useEffect(() => {
    if (!posthog) return;

    // Remove old is_offline property that was previously registered
    posthog.unregister('is_offline');
  }, [posthog]);

  useEffect(() => {
    if (!posthog) return;

    // Map connectivity state to string value
    // null = unknown, true = offline, false = online
    const connectivityStatus =
      isOffline === null ? 'unknown' : isOffline ? 'offline' : 'online';

    console.log('[PostHog] Connectivity status changed:', {
      isOffline,
      connectivityStatus,
    });

    // Register connectivity status as a super property (applies to all events)
    posthog.register({
      connectivity_status: connectivityStatus,
    });
  }, [posthog, isOffline]);

  return null;
}

// ---- Global Feature Flag Poller ----
// Polls feature flags every 1s for 30s when triggered
// Fetches session recording config from Cloudflare

type GlobalFeatureFlagPollerProps = {
  onBannerMessageChange: (payload: any) => void;
  onCloudflareConfigChange: (config: {
    enabledBuilds: string[];
    enabledEmails: string[];
  }) => void;
  triggerRef: React.MutableRefObject<(() => void) | null>;
};

function GlobalFeatureFlagPoller({
  onBannerMessageChange,
  onCloudflareConfigChange,
  triggerRef,
}: GlobalFeatureFlagPollerProps) {
  const posthog = usePostHog();
  const [refreshKey, setRefreshKey] = useState(0);

  // Track previous flag values to detect changes
  const prevFlagValues = useRef<Map<string, any>>(new Map());

  // Expose trigger function via ref
  useEffect(() => {
    triggerRef.current = () => {
      console.log('[GlobalFeatureFlagPoller] Triggering new polling cycle');
      posthog?.reloadFeatureFlags();
      setRefreshKey(prev => prev + 1);
    };
  }, [posthog, triggerRef]);

  // Auto-trigger on mount
  useEffect(() => {
    triggerRef.current?.();
  }, [triggerRef]);

  // Trigger polling when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        console.log('[GlobalFeatureFlagPoller] App came to foreground');
        triggerRef.current?.();
      }
    });
    return () => sub.remove();
  }, [triggerRef]);

  useEffect(() => {
    if (!posthog) {
      console.log('[GlobalFeatureFlagPoller] No posthog instance yet');
      return;
    }

    console.log('[GlobalFeatureFlagPoller] Starting polling cycle', {
      refreshKey,
    });

    // Fetch session recording config from Cloudflare at the start of each polling cycle
    console.log(
      '[GlobalFeatureFlagPoller] Fetching session recording config from Cloudflare...',
    );
    fetchSessionRecordingConfig()
      .then(config => {
        if (config) {
          console.log(
            '[GlobalFeatureFlagPoller] Cloudflare config received:',
            config,
          );
          onCloudflareConfigChange(config);
        }
      })
      .catch(error => {
        console.log(
          '[GlobalFeatureFlagPoller] Error fetching Cloudflare config:',
          error,
        );
      });

    let pollCount = 0;
    const checkForUpdates = () => {
      pollCount++;
      // Check banner_message flag
      const bannerPayload = posthog.getFeatureFlagPayload('banner_message');
      const prevBannerValue = prevFlagValues.current.get('banner_message');
      if (JSON.stringify(prevBannerValue) !== JSON.stringify(bannerPayload)) {
        console.log('[GlobalFeatureFlagPoller] banner_message changed:', {
          prev: prevBannerValue,
          new: bannerPayload,
        });
        prevFlagValues.current.set('banner_message', bannerPayload);
        onBannerMessageChange(bannerPayload);
      }
    };

    // Check immediately
    checkForUpdates();

    // Poll every 1 second for 30 seconds
    const pollInterval = setInterval(checkForUpdates, 1000);

    // Stop polling after 30 seconds
    const stopTimeout = setTimeout(() => {
      clearInterval(pollInterval);
      console.log('[GlobalFeatureFlagPoller] Stopped polling after 30s', {
        totalPolls: pollCount,
      });
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(stopTimeout);
    };
  }, [refreshKey, posthog, onBannerMessageChange, onCloudflareConfigChange]);

  return null;
}

// ---- Manual screen tracking using the NavigationContainer ref ----
function ScreenTracker({navRef}: {navRef: NavigationContainerRef<any>}) {
  const posthog = usePostHog();
  const prevRouteName = useRef<string | undefined>(undefined);

  useEffect(() => {
    const send = () => {
      const current = navRef.getCurrentRoute();
      const name = current?.name;
      if (!name || prevRouteName.current === name) return;
      prevRouteName.current = name;

      // Map to prettier names if you like:
      // const pretty = SCREEN_TITLES[name] ?? name;
      const pretty = name;

      posthog?.screen(pretty, {
        route: name,
        // You can also attach params if safe: ...current?.params
      });
    };

    // Fire on ready + on each nav state change
    if ((navRef as any).isReady?.()) send();
    const unsub = (navRef as any).addListener?.('state', send);
    return () => {
      if (unsub) unsub();
    };
  }, [navRef, posthog]);

  return null;
}

// ---- Session Recording Configuration ----
// Session recording is controlled via PostHog feature flag payload with
// client-side computation of shouldRecord based on build number and email.

const SESSION_RECORDING_PAYLOAD_KEY = 'posthog.session_recording_payload';

// ---- Session Recording Payload Structure ----
// This payload is used to control session recording via feature flags
// with client-side computation of shouldRecord

type SessionRecordingPayload = {
  sequence: number; // Monotonically increasing - ignore if <= cached
  enabledBuilds: string[]; // Build patterns: exact (999), range (100-200), min (300-), max (-500)
  enabledEmails: string[]; // Email patterns with glob support (* = wildcard)
};

export type CachedSessionRecordingPayload = {
  sequence: number;
  payload: SessionRecordingPayload;
};

// ---- Email Glob Matching ----
// Matches email patterns like "*@techmatters.org" or "specific@example.com"

function emailMatchesPattern(email: string, pattern: string): boolean {
  // Convert glob pattern to regex
  // * matches any characters, escape other regex special chars
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars except *
    .replace(/\*/g, '.*'); // Convert * to .*

  const regex = new RegExp(`^${regexPattern}$`, 'i'); // Case insensitive
  return regex.test(email);
}

function emailMatchesAnyPattern(
  email: string | undefined,
  patterns: string[],
): boolean {
  if (!email) return false;
  return patterns.some(pattern => emailMatchesPattern(email, pattern));
}

// ---- Build Number Helpers ----

function getCurrentBuildNumber(): number {
  const buildString =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString();
  return parseInt(buildString || '0', 10);
}

/**
 * Check if a build number matches a single pattern.
 * Patterns can be:
 *   - Exact: "999" matches build 999
 *   - Range: "100-200" matches builds 100-200 inclusive
 *   - Min only: "300-" matches builds >= 300
 *   - Max only: "-500" matches builds <= 500
 */
function buildMatchesPattern(buildNumber: number, pattern: string): boolean {
  // Defensive: convert to string in case of legacy cached data with numbers
  const trimmed = String(pattern).trim();

  // Check for range patterns (contains hyphen, but not just a leading hyphen for max-only)
  if (trimmed.includes('-')) {
    // Max only: "-500" (starts with hyphen, rest is a number)
    if (trimmed.startsWith('-')) {
      const maxStr = trimmed.slice(1);
      const max = parseInt(maxStr, 10);
      if (!isNaN(max)) {
        return buildNumber <= max;
      }
    }

    // Min only: "300-" (ends with hyphen)
    if (trimmed.endsWith('-')) {
      const minStr = trimmed.slice(0, -1);
      const min = parseInt(minStr, 10);
      if (!isNaN(min)) {
        return buildNumber >= min;
      }
    }

    // Range: "100-200"
    const parts = trimmed.split('-');
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const max = parseInt(parts[1], 10);
      if (!isNaN(min) && !isNaN(max)) {
        return buildNumber >= min && buildNumber <= max;
      }
    }
  }

  // Exact match: "999"
  const exact = parseInt(trimmed, 10);
  if (!isNaN(exact)) {
    return buildNumber === exact;
  }

  return false;
}

function buildNumberMatches(
  buildNumber: number,
  enabledBuilds: string[],
): boolean {
  const results = enabledBuilds.map(pattern => ({
    pattern,
    matches: buildMatchesPattern(buildNumber, pattern),
  }));
  console.log('[PostHog] buildNumberMatches:', {
    buildNumber,
    enabledBuilds,
    results,
  });
  return results.some(r => r.matches);
}

// ---- Compute shouldRecord ----
// Returns true if current build OR email matches the payload criteria

function computeShouldRecord(
  payload: SessionRecordingPayload | null,
  email: string | undefined,
): boolean {
  if (!payload) return false;

  const buildNumber = getCurrentBuildNumber();
  const buildMatches = buildNumberMatches(
    buildNumber,
    payload.enabledBuilds || [],
  );
  const emailMatches = emailMatchesAnyPattern(
    email,
    payload.enabledEmails || [],
  );

  console.log('[PostHog] computeShouldRecord:', {
    buildNumber,
    email: email ?? '(none)',
    enabledBuilds: payload.enabledBuilds,
    enabledEmails: payload.enabledEmails,
    buildMatches,
    emailMatches,
    result: buildMatches || emailMatches,
  });

  return buildMatches || emailMatches;
}

// ---- Payload Caching ----

export function getCachedPayload(): CachedSessionRecordingPayload | null {
  return (
    kvStorage.getObject<CachedSessionRecordingPayload>(
      SESSION_RECORDING_PAYLOAD_KEY,
    ) ?? null
  );
}

export function saveCachedPayload(
  payload: CachedSessionRecordingPayload,
): void {
  kvStorage.setObject(SESSION_RECORDING_PAYLOAD_KEY, payload);
}

// ---- Session Recording State Context ----
// Provides wantRecording, isRecording, and showRestartBanner to children

type SessionRecordingStateContextType = {
  wantRecording: boolean;
  isRecording: boolean;
  showRestartBanner: boolean;
};

const SessionRecordingStateContext =
  createContext<SessionRecordingStateContextType | null>(null);

export function useSessionRecordingState() {
  return useContext(SessionRecordingStateContext);
}

// Helper to clear stored session recording payload (for testing)
export function clearSessionRecordingPayload(): void {
  console.log('[PostHog] Clearing stored session recording payload');
  kvStorage.remove(SESSION_RECORDING_PAYLOAD_KEY);
}

// Helper to check if native session replay is active
export async function checkNativeSessionReplayStatus(): Promise<boolean> {
  try {
    const isActive = await isSessionReplayEnabled();
    console.log('[PostHog] Native session replay active:', isActive);
    return isActive;
  } catch (e) {
    console.log('[PostHog] Could not check native session replay status:', e);
    return false;
  }
}

// Internal PostHog component - assumes config has already been loaded
function PostHogInner({children, navRef}: Props) {
  // Check if email is available at PostHog component render time
  // This runs BEFORE PostHogProvider initializes
  const currentUserFromRedux = useSelector(
    (state: any) => state.account?.currentUser?.data,
  );
  const emailAtRenderTime = currentUserFromRedux?.email;

  const enabled =
    !!APP_CONFIG.posthogApiKey &&
    !!APP_CONFIG.posthogHost &&
    APP_CONFIG.posthogApiKey !== 'REPLACE_ME';

  // ---- Session Recording State ----
  // isRecording: what was computed and bootstrapped on app startup (immutable until restart)
  // wantRecording: what we WANT based on the latest valid payload (can change during session)

  // Compute isRecording once on mount from cached payload + current email
  const [isRecording] = useState(() => {
    const cached = getCachedPayload();
    console.log('[PostHog] Initial isRecording - reading cache:', {
      cached: JSON.stringify(cached),
      emailAtRenderTime,
      currentBuildNumber: getCurrentBuildNumber(),
    });
    const shouldRecord = computeShouldRecord(
      cached?.payload ?? null,
      emailAtRenderTime,
    );
    console.log('[PostHog] Initial isRecording computed:', {
      cached: cached?.payload,
      email: emailAtRenderTime,
      shouldRecord,
    });
    return shouldRecord;
  });

  // Track what we WANT (can change during session)
  const [wantRecording, setWantRecording] = useState(isRecording);

  // Show restart banner when want != is (with delay to ensure persistence)
  const [showRestartBanner, setShowRestartBanner] = useState(false);

  // Update restart banner visibility when wantRecording changes
  useEffect(() => {
    if (wantRecording !== isRecording) {
      // Wait 5 seconds before showing banner to ensure kvStorage write persisted
      const timeout = setTimeout(() => {
        console.log(
          '[PostHog] Showing restart banner - want:',
          wantRecording,
          'is:',
          isRecording,
        );
        setShowRestartBanner(true);
      }, 5000);
      return () => clearTimeout(timeout);
    } else {
      setShowRestartBanner(false);
    }
  }, [wantRecording, isRecording]);

  // Recompute wantRecording when email changes (login/logout)
  useEffect(() => {
    const cached = getCachedPayload();
    const newWant = computeShouldRecord(
      cached?.payload ?? null,
      emailAtRenderTime,
    );
    console.log('[PostHog] Email changed - recomputing wantRecording:', {
      email: emailAtRenderTime,
      newWant,
      currentWant: wantRecording,
    });
    setWantRecording(newWant);
  }, [emailAtRenderTime]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ref to hold the trigger function for the global poller
  const triggerRef = useRef<(() => void) | null>(null);

  // Handler for banner message changes - we'll expose this via context
  const [bannerMessagePayload, setBannerMessagePayload] = useState<any>(null);
  const handleBannerMessageChange = useCallback((payload: any) => {
    setBannerMessagePayload(payload);
  }, []);

  // Handler for Cloudflare config changes (from polling)
  const handleCloudflareConfigChange = useCallback(
    (config: {enabledBuilds: string[]; enabledEmails: string[]}) => {
      console.log('[PostHog] handleCloudflareConfigChange:', config);

      // Save to cache
      const cachedPayload: CachedSessionRecordingPayload = {
        sequence: 0,
        payload: {
          sequence: 0,
          enabledBuilds: config.enabledBuilds,
          enabledEmails: config.enabledEmails,
        },
      };
      saveCachedPayload(cachedPayload);

      // Recompute wantRecording
      const newWant = computeShouldRecord(
        cachedPayload.payload,
        emailAtRenderTime,
      );
      console.log('[PostHog] Cloudflare config - recomputed wantRecording:', {
        newWant,
        currentWant: wantRecording,
        isRecording,
        willShowBanner: newWant !== isRecording,
      });
      setWantRecording(newWant);
    },
    [emailAtRenderTime, wantRecording, isRecording],
  );

  if (!enabled) {
    console.warn('PostHog API key not set, analytics disabled');
    return <>{children}</>;
  }

  console.log('[PostHog] Initializing with:', {
    host: APP_CONFIG.posthogHost,
    enableSessionReplay: isRecording,
    wantRecording,
    showRestartBanner,
    platform: Platform.OS,
    buildNumber: getCurrentBuildNumber(),
    email: emailAtRenderTime ?? '(none)',
  });

  // Create context values
  const pollingContextValue = {
    trigger: () => {
      triggerRef.current?.();
    },
    bannerMessagePayload,
  };

  const sessionRecordingStateValue = {
    wantRecording,
    isRecording,
    showRestartBanner,
  };

  return (
    <PostHogProvider
      apiKey={APP_CONFIG.posthogApiKey}
      options={{
        host: APP_CONFIG.posthogHost,
        disabled: false,
        captureAppLifecycleEvents: true,
        // batching knobs (tune as you like)
        flushAt: 20, // number of events to queue before flushing (send to server)
        flushInterval: 10000, // milliseconds between periodic flushes
        // Provide app version, build, and platform for all events
        customAppProperties: properties => ({
          ...properties,
          $app_version: Constants.expoConfig?.version || 'unknown',
          $app_build:
            Platform.OS === 'ios'
              ? Constants.expoConfig?.ios?.buildNumber
              : Constants.expoConfig?.android?.versionCode?.toString() ||
                'unknown',
          platform: APP_CONFIG.environment || 'development',
        }),
        // Session recording enabled based on startup computation
        // This cannot be changed at runtime - requires app restart
        enableSessionReplay: isRecording,
        sessionReplayConfig: isRecording
          ? {
              // Safe defaults - no masking on Android to avoid crashes
              maskAllTextInputs: Platform.OS !== 'android',
              maskAllImages: Platform.OS !== 'android',
              captureLog: true,
            }
          : undefined,
        // Bootstrap with session_recording flag so SDK's linkedFlag check passes
        bootstrap: {
          featureFlags: {
            session_recording: isRecording,
          },
        },
      }}
      // IMPORTANT: turn off SDK's nav autocapture to avoid nav hook errors
      autocapture={{captureScreens: false}}
      // Enable debug logging in development via POSTHOG_DEBUG env var
      // Set POSTHOG_DEBUG=true in .env to see detailed PostHog capture logs
      debug={APP_CONFIG.posthogDebug === 'true'}>
      <SessionRecordingStateContext.Provider value={sessionRecordingStateValue}>
        <FeatureFlagPollingContext.Provider value={pollingContextValue}>
          <PostHogInstanceSetter />
          <PosthogLifecycle />
          <UserIdentification />
          <ConnectivityTracker />
          <ScreenTracker navRef={navRef} />
          <GlobalFeatureFlagPoller
            onBannerMessageChange={handleBannerMessageChange}
            onCloudflareConfigChange={handleCloudflareConfigChange}
            triggerRef={triggerRef}
          />
          {children}
        </FeatureFlagPollingContext.Provider>
      </SessionRecordingStateContext.Provider>
    </PostHogProvider>
  );
}

// ---- PostHog Wrapper with Config Loading ----
// Fetches session recording config from Cloudflare before initializing PostHog
// This ensures we have fresh config for the session recording decision

export function PostHog({children, navRef}: Props) {
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      console.log('[PostHog] Loading session recording config...');

      try {
        const config = await fetchSessionRecordingConfig();

        if (config) {
          // Successfully fetched from Cloudflare - save to cache
          // Note: We use sequence 0 for Cloudflare config since it doesn't have sequence numbers
          // The PostHog feature flag polling (if still used) will have higher sequence numbers
          const cachedPayload: CachedSessionRecordingPayload = {
            sequence: 0, // Cloudflare config doesn't use sequence
            payload: {
              sequence: 0,
              enabledBuilds: config.enabledBuilds,
              enabledEmails: config.enabledEmails,
            },
          };
          saveCachedPayload(cachedPayload);
          console.log('[PostHog] Saved Cloudflare config to cache:', config);
        } else {
          console.log(
            '[PostHog] No Cloudflare config, using cached value or default',
          );
        }
      } catch (error) {
        console.log('[PostHog] Error loading config, using cached:', error);
      }

      setConfigLoaded(true);
    };

    loadConfig();
  }, []);

  // While loading config, render children without PostHog
  // Analytics events during this brief window will be silently dropped
  if (!configLoaded) {
    console.log('[PostHog] Config loading, rendering without PostHog...');
    return <>{children}</>;
  }

  // Config loaded - render PostHog with fresh config from cache
  return <PostHogInner navRef={navRef}>{children}</PostHogInner>;
}

// ---- Feature Flag Polling Trigger ----
// Component to be placed on screens that should trigger feature flag polling on focus
// Usage: <FeatureFlagPollingTrigger />

export function FeatureFlagPollingTrigger() {
  const context = useFeatureFlagPollingContext();

  // Trigger polling when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (context) {
        console.log(
          '[FeatureFlagPollingTrigger] Screen focused, triggering polling',
        );
        context.trigger();
      }
    }, [context]),
  );

  return null;
}
