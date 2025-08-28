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

import {ReactNode, useEffect} from 'react';
import {AppState} from 'react-native';

import {PostHogProvider, usePostHog} from 'posthog-react-native';

import {APP_CONFIG} from 'terraso-mobile-client/config';

// flush posthog when active state changes
export function PosthogLifecycle() {
  const posthog = usePostHog();

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') posthog?.flush();
    });
    return () => sub.remove();
  }, [posthog]);

  return null;
}

export function PostHog({children}: {children: ReactNode}) {
  if (
    APP_CONFIG.posthogApiKey &&
    APP_CONFIG.posthogHost &&
    APP_CONFIG.posthogApiKey !== '' &&
    APP_CONFIG.posthogApiKey !== 'REPLACE_ME'
  ) {
    return (
      <PostHogProvider
        apiKey={APP_CONFIG.posthogApiKey}
        options={{
          host: APP_CONFIG.posthogHost,
          disabled: false,
        }}>
        <PosthogLifecycle />
        {children}
      </PostHogProvider>
    );
  } else {
    console.warn('PostHog API key not set, analytics disabled');
    return <>{children}</>;
  }
}
