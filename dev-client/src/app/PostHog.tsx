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

// ---- Background flush on app losing focus ----
function PosthogLifecycle() {
  const posthog = usePostHog();

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        posthog?.flush();
      }
      // Note: reloadFeatureFlags on foreground is handled by GlobalFeatureFlagPoller
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
        triggerRef.current?.();
      }
    });
    return () => sub.remove();
  }, [triggerRef]);

  useEffect(() => {
    if (!posthog) {
      return;
    }

    // Fetch session recording config from Cloudflare at the start of each polling cycle
    fetchSessionRecordingConfig()
      .then(config => {
        if (config) {
          onCloudflareConfigChange(config);
        }
      })
      .catch(() => {
        // Silently ignore fetch errors - will use cached config
      });

    const checkForUpdates = () => {
      // Check banner_message flag
      const bannerPayload = posthog.getFeatureFlagPayload('banner_message');
      const prevBannerValue = prevFlagValues.current.get('banner_message');
      if (JSON.stringify(prevBannerValue) !== JSON.stringify(bannerPayload)) {
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
      const name = navRef.getCurrentRoute()?.name;
      if (!name || prevRouteName.current === name) return;
      prevRouteName.current = name;
      posthog?.screen(name, {route: name});
    };

    if ((navRef as any).isReady?.()) send();
    const unsub = (navRef as any).addListener?.('state', send);
    return () => unsub?.();
  }, [navRef, posthog]);

  return null;
}

// ---- Session Recording Configuration ----
// Session recording is controlled via Cloudflare Worker config with
// client-side computation of shouldRecord based on build number and email.

const SESSION_RECORDING_PAYLOAD_KEY = 'posthog.session_recording_payload';

type SessionRecordingConfig = {
  enabledBuilds: string[]; // Build patterns: exact (999), range (100-200), min (300-), max (-500)
  enabledEmails: string[]; // Email patterns with glob support (* = wildcard)
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
  const trimmed = String(pattern).trim();

  let min = 0;
  let max = Number.MAX_SAFE_INTEGER;

  const rangeMatch = trimmed.match(/^(\d*)-(\d*)$/);
  if (rangeMatch) {
    const [, minStr, maxStr] = rangeMatch;
    if (!minStr && !maxStr) return false; // Reject bare "-"
    if (minStr) min = parseInt(minStr, 10);
    if (maxStr) max = parseInt(maxStr, 10);
  } else {
    const exact = parseInt(trimmed, 10);
    if (isNaN(exact)) return false;
    min = max = exact;
  }

  return buildNumber >= min && buildNumber <= max;
}

// ---- Compute shouldRecord ----
// Returns true if current build OR email matches the config criteria

function computeShouldRecord(
  config: SessionRecordingConfig | null,
  email: string | undefined,
): boolean {
  if (!config) return false;

  const buildNumber = getCurrentBuildNumber();
  const buildMatches = (config.enabledBuilds || []).some(pattern =>
    buildMatchesPattern(buildNumber, pattern),
  );
  const emailMatches =
    email !== undefined &&
    (config.enabledEmails || []).some(pattern =>
      emailMatchesPattern(email, pattern),
    );

  return buildMatches || emailMatches;
}

// ---- Config Caching ----

export function getCachedConfig(): SessionRecordingConfig | null {
  // Handle both old format (with .payload wrapper) and new format (direct)
  const cached = kvStorage.getObject<any>(SESSION_RECORDING_PAYLOAD_KEY);
  if (!cached) return null;
  return cached.payload ?? cached;
}

function saveCachedConfig(config: SessionRecordingConfig): void {
  kvStorage.setObject(SESSION_RECORDING_PAYLOAD_KEY, config);
}

// ---- Session Recording State Context ----
// Provides wantRecording and isRecording to children

type SessionRecordingStateContextType = {
  wantRecording: boolean;
  isRecording: boolean;
};

const SessionRecordingStateContext =
  createContext<SessionRecordingStateContextType | null>(null);

export function useSessionRecordingState() {
  return useContext(SessionRecordingStateContext);
}

// Helper to clear stored session recording payload (for testing)
export function clearSessionRecordingPayload(): void {
  kvStorage.remove(SESSION_RECORDING_PAYLOAD_KEY);
}

// Helper to check if native session replay is active
export async function checkNativeSessionReplayStatus(): Promise<boolean> {
  try {
    return await isSessionReplayEnabled();
  } catch {
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

  // Compute isRecording once on mount from cached config + current email
  const [isRecording] = useState(() => {
    return computeShouldRecord(getCachedConfig(), emailAtRenderTime);
  });

  // Track what we WANT (can change during session)
  const [wantRecording, setWantRecording] = useState(isRecording);

  // Recompute wantRecording when email changes (login/logout)
  useEffect(() => {
    setWantRecording(computeShouldRecord(getCachedConfig(), emailAtRenderTime));
  }, [emailAtRenderTime]);

  // Ref to hold the trigger function for the global poller
  const triggerRef = useRef<(() => void) | null>(null);

  // Handler for banner message changes - we'll expose this via context
  const [bannerMessagePayload, setBannerMessagePayload] = useState<any>(null);
  const handleBannerMessageChange = useCallback((payload: any) => {
    setBannerMessagePayload(payload);
  }, []);

  // Handler for Cloudflare config changes (from polling)
  const handleCloudflareConfigChange = useCallback(
    (config: SessionRecordingConfig) => {
      saveCachedConfig(config);
      setWantRecording(computeShouldRecord(config, emailAtRenderTime));
    },
    [emailAtRenderTime],
  );

  if (!enabled) {
    return <>{children}</>;
  }

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
  };

  return (
    <PostHogProvider
      apiKey={APP_CONFIG.posthogApiKey}
      options={{
        host: APP_CONFIG.posthogHost,
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
              // Masking disabled - caused stack-related crashes and we don't need it
              maskAllTextInputs: false,
              maskAllImages: false,
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
    fetchSessionRecordingConfig()
      .then(config => {
        if (config) {
          saveCachedConfig(config);
        }
      })
      .catch(() => {
        // Silently ignore fetch errors - will use cached config
      })
      .finally(() => {
        setConfigLoaded(true);
      });
  }, []);

  // While loading config, render children without PostHog
  // Analytics events during this brief window will be silently dropped
  if (!configLoaded) {
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
      context?.trigger();
    }, [context]),
  );

  return null;
}
