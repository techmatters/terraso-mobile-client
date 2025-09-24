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

import {ReactNode, useEffect, useMemo, useRef} from 'react';
import {AppState, Platform} from 'react-native';

import Constants from 'expo-constants';

import {NavigationContainerRef} from '@react-navigation/native';
import {PostHogProvider, usePostHog} from 'posthog-react-native';

import {APP_CONFIG} from 'terraso-mobile-client/config';
import {useSelector} from 'terraso-mobile-client/store';

type Props = {
  children: ReactNode;
  navRef: NavigationContainerRef<any>;
};

// ---- Background flush on app losing focus ----
function PosthogLifecycle() {
  const posthog = usePostHog();

  // Optional: remove this initial test event if you don’t want it
  useEffect(() => {
    if (posthog) {
      console.log('[PostHog] Sending test event');
      posthog.capture('PostHog Test Event', {
        timestamp: new Date().toISOString(),
      });
    }
  }, [posthog]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') posthog?.flush();
    });
    return () => sub.remove();
  }, [posthog]);

  return null;
}

// ---- User exclusion based on email patterns ----
// these are set in the github settings secrets as C
// e.g. "^$|.*@techmatters\.org$"
function UserExclusionHandler() {
  const posthog = usePostHog();
  const currentUser = useSelector(state => state.account.currentUser?.data);
  const excludedPatterns = useMemo(
    () => (APP_CONFIG.posthogExcludedEmails || '').split('|').filter(Boolean),
    [],
  );
  console.log(
    '[PostHog] Exclusion patterns:',
    APP_CONFIG.posthogExcludedEmails,
  );

  useEffect(() => {
    if (!posthog) return;

    const email = currentUser?.email || '';
    const isExcluded = excludedPatterns.some((pattern: string) => {
      try {
        return new RegExp(pattern).test(email);
      } catch (e) {
        console.warn(`[PostHog] Invalid regex pattern: ${pattern}`, e);
        return false;
      }
    });

    if (isExcluded) {
      console.log(
        `[PostHog] User excluded from tracking: ${email || '(no email)'}`,
      );
      posthog.optOut();
    } else {
      console.log(`[PostHog] User tracking enabled: ${email || '(no email)'}`);
      posthog.optIn();
    }
  }, [currentUser?.email, excludedPatterns, posthog]);

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
        flushAt: 10,
        flushInterval: 5000,
        // Provide app version and build for lifecycle tracking
        customAppProperties: properties => ({
          ...properties,
          $app_version: Constants.expoConfig?.version || 'unknown',
          $app_build:
            Platform.OS === 'ios'
              ? Constants.expoConfig?.ios?.buildNumber
              : Constants.expoConfig?.android?.versionCode?.toString() ||
                'unknown',
        }),
      }}
      // IMPORTANT: turn off SDK's nav autocapture to avoid nav hook errors
      autocapture={{captureScreens: false}}
      debug={true}>
      <PosthogLifecycle />
      <UserExclusionHandler />
      <ScreenTracker navRef={navRef} />
      {children}
    </PostHogProvider>
  );
}
