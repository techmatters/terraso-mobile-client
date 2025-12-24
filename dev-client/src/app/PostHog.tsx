/*
 * Copyright © 2025 Technology Matters
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

import {setPostHogInstance} from 'terraso-mobile-client/app/posthogInstance';
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
// Polls all registered feature flags every 1s for 30s when triggered
// Provides both banner_message and session_recording flag updates

type GlobalFeatureFlagPollerProps = {
  onBannerMessageChange: (payload: any) => void;
  onSessionRecordingChange: (payload: any) => void;
  triggerRef: React.MutableRefObject<(() => void) | null>;
};

function GlobalFeatureFlagPoller({
  onBannerMessageChange,
  onSessionRecordingChange,
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
      return;
    }

    const checkForUpdates = () => {
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

      // Check session_recording flag
      const sessionPayload = posthog.getFeatureFlagPayload('session_recording');
      const prevSessionValue = prevFlagValues.current.get('session_recording');
      if (JSON.stringify(prevSessionValue) !== JSON.stringify(sessionPayload)) {
        console.log('[GlobalFeatureFlagPoller] session_recording changed:', {
          prev: prevSessionValue,
          new: sessionPayload,
        });
        prevFlagValues.current.set('session_recording', sessionPayload);
        onSessionRecordingChange(sessionPayload);
      }
    };

    // Check immediately
    checkForUpdates();

    // Poll every 1 second for 30 seconds
    const pollInterval = setInterval(checkForUpdates, 1000);

    // Stop polling after 30 seconds
    const stopTimeout = setTimeout(() => {
      clearInterval(pollInterval);
      console.log('[GlobalFeatureFlagPoller] Stopped polling after 30s');
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(stopTimeout);
    };
  }, [refreshKey, posthog, onBannerMessageChange, onSessionRecordingChange]);

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
// Manages session recording configuration from PostHog feature flags
// Persists config to survive app restarts

const SESSION_RECORDING_CONFIG_KEY = 'posthog.session_recording_config';

type SessionRecordingConfig = {
  enabled: boolean;
  maskAllTextInputs?: boolean;
  maskAllImages?: boolean;
  captureLog?: boolean;
};

// Helper to get persisted session recording config
export function getSessionRecordingConfig(): SessionRecordingConfig {
  const stored = kvStorage.getObject<SessionRecordingConfig>(
    SESSION_RECORDING_CONFIG_KEY,
  );
  return (
    stored ?? {
      enabled: false,
      maskAllTextInputs: true,
      maskAllImages: true,
      captureLog: true,
    }
  );
}

export function PostHog({children, navRef}: Props) {
  const enabled =
    !!APP_CONFIG.posthogApiKey &&
    !!APP_CONFIG.posthogHost &&
    APP_CONFIG.posthogApiKey !== 'REPLACE_ME';

  // Track when session recording config changes to trigger remount
  const [remountKey, setRemountKey] = useState(0);

  // Ref to hold the trigger function for the global poller
  const triggerRef = useRef<(() => void) | null>(null);

  // Handler for session recording config changes
  const handleSessionRecordingChange = useCallback((payload: any) => {
    const currentConfig = getSessionRecordingConfig();
    let newConfig: SessionRecordingConfig;
    if (!payload || typeof payload !== 'object') {
      newConfig = {
        enabled: false,
        maskAllTextInputs: true,
        maskAllImages: true,
        captureLog: true,
      };
    } else {
      newConfig = {
        enabled: payload.enabled !== false,
        maskAllTextInputs: payload.maskAllTextInputs !== false,
        maskAllImages: payload.maskAllImages !== false,
        captureLog: payload.captureLog !== false,
      };
    }

    if (JSON.stringify(currentConfig) !== JSON.stringify(newConfig)) {
      console.log('[PostHog] Session recording config changed:', {
        old: currentConfig,
        new: newConfig,
      });
      kvStorage.setObject(SESSION_RECORDING_CONFIG_KEY, newConfig);
      setRemountKey(prev => prev + 1);
    }
  }, []);

  // Handler for banner message changes - we'll expose this via context
  const [bannerMessagePayload, setBannerMessagePayload] = useState<any>(null);
  const handleBannerMessageChange = useCallback((payload: any) => {
    setBannerMessagePayload(payload);
  }, []);

  if (!enabled) {
    console.warn('PostHog API key not set, analytics disabled');
    return <>{children}</>;
  }

  // Get current session recording config
  const sessionRecordingConfig = getSessionRecordingConfig();

  console.log('[PostHog] Initializing with:', {
    host: APP_CONFIG.posthogHost,
    captureAppLifecycleEvents: true,
    autocaptureScreens: false, // <- we're doing manual screen tracking
    enableSessionReplay: sessionRecordingConfig.enabled,
    sessionReplayConfig: sessionRecordingConfig.enabled
      ? {
          maskAllTextInputs: sessionRecordingConfig.maskAllTextInputs,
          maskAllImages: sessionRecordingConfig.maskAllImages,
          captureLog: sessionRecordingConfig.captureLog,
        }
      : undefined,
  });

  // Create context value
  const contextValue = {
    trigger: () => {
      triggerRef.current?.();
    },
    bannerMessagePayload,
  };

  return (
    <PostHogProvider
      key={remountKey}
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
        // Session recording config from feature flags
        enableSessionReplay: sessionRecordingConfig.enabled,
        sessionReplayConfig: sessionRecordingConfig.enabled
          ? {
              maskAllTextInputs: sessionRecordingConfig.maskAllTextInputs,
              maskAllImages: sessionRecordingConfig.maskAllImages,
              captureLog: sessionRecordingConfig.captureLog,
            }
          : undefined,
      }}
      // IMPORTANT: turn off SDK's nav autocapture to avoid nav hook errors
      autocapture={{captureScreens: false}}
      // Enable debug logging in development via POSTHOG_DEBUG env var
      // Set POSTHOG_DEBUG=true in .env to see detailed PostHog capture logs
      debug={APP_CONFIG.posthogDebug === 'true'}>
      <FeatureFlagPollingContext.Provider value={contextValue}>
        <PostHogInstanceSetter />
        <PosthogLifecycle />
        <UserIdentification />
        <ConnectivityTracker />
        <ScreenTracker navRef={navRef} />
        <GlobalFeatureFlagPoller
          onBannerMessageChange={handleBannerMessageChange}
          onSessionRecordingChange={handleSessionRecordingChange}
          triggerRef={triggerRef}
        />
        {children}
      </FeatureFlagPollingContext.Provider>
    </PostHogProvider>
  );
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
