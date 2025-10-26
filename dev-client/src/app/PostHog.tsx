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

import {ReactNode, useContext, useEffect, useRef} from 'react';
import {AppState, Platform} from 'react-native';

import Constants from 'expo-constants';

import {NavigationContainerRef} from '@react-navigation/native';
import {PostHogProvider, usePostHog} from 'posthog-react-native';

import {setPostHogInstance} from 'terraso-mobile-client/app/posthogInstance';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {ConnectivityContext} from 'terraso-mobile-client/context/connectivity/ConnectivityContext';
import {useSelector} from 'terraso-mobile-client/store';

type Props = {
  children: ReactNode;
  navRef: NavigationContainerRef<any>;
};

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

export function PostHog({children, navRef}: Props) {
  const enabled =
    !!APP_CONFIG.posthogApiKey &&
    !!APP_CONFIG.posthogHost &&
    APP_CONFIG.posthogApiKey !== 'REPLACE_ME';

  if (!enabled) {
    console.warn('PostHog API key not set, analytics disabled');
    return <>{children}</>;
  }

  console.log('[PostHog] Initializing with:', {
    host: APP_CONFIG.posthogHost,
    captureAppLifecycleEvents: true,
    autocaptureScreens: false, // <- we’re doing manual screen tracking
  });

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
      }}
      // IMPORTANT: turn off SDK's nav autocapture to avoid nav hook errors
      autocapture={{captureScreens: false}}
      // Enable debug logging in development via POSTHOG_DEBUG env var
      // Set POSTHOG_DEBUG=true in .env to see detailed PostHog capture logs
      debug={APP_CONFIG.posthogDebug === 'true'}>
      <PostHogInstanceSetter />
      <PosthogLifecycle />
      <UserIdentification />
      <ConnectivityTracker />
      <ScreenTracker navRef={navRef} />
      {children}
    </PostHogProvider>
  );
}
