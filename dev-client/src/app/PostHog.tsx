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

import {ReactNode, useEffect, useRef} from 'react';
import {AppState} from 'react-native';

import {NavigationContainerRef} from '@react-navigation/native';
import {PostHogProvider, usePostHog} from 'posthog-react-native';

import {APP_CONFIG} from 'terraso-mobile-client/config';

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
      }}
      // IMPORTANT: turn off SDK's nav autocapture to avoid nav hook errors
      autocapture={{captureScreens: false}}
      debug={true}>
      <PosthogLifecycle />
      <ScreenTracker navRef={navRef} />
      {children}
    </PostHogProvider>
  );
}
