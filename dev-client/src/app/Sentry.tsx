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

import React from 'react';

import {captureConsoleIntegration} from '@sentry/core';
import * as Sentry from '@sentry/react-native';

// On production environment:
// - mask user data
// - use a 10% sample rate

import {APP_CONFIG} from 'terraso-mobile-client/config';

// - disable Sentry debugging
const isProduction = APP_CONFIG.environment === 'production';

if (APP_CONFIG.sentryEnabled) {
  Sentry.init({
    debug: !isProduction,
    dsn: APP_CONFIG.sentryDsn,
    environment: APP_CONFIG.environment,
    integrations: [
      captureConsoleIntegration({levels: ['warn', 'error']}),
      Sentry.mobileReplayIntegration({
        maskAllImages: isProduction,
        maskAllVectors: isProduction,
        maskAllText: isProduction,
      }),
    ],
    enableCaptureFailedRequests: true,
    tracePropagationTargets: [APP_CONFIG.terrasoApiHostname],
    enableUserInteractionTracing: true,
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    _experiments: {
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    },
    beforeSend(event, hint) {
      // Filter out known library errors that don't affect functionality
      const message = event.message || hint.originalException?.toString() || '';

      // Mapbox ViewTagResolver errors - timing issues in native bridge, not actionable
      if (message.includes('ViewTagResolver')) {
        return null;
      }

      return event;
    },
  });
}

export const wrapSentry = <P extends Record<string, unknown>>(
  component: React.ComponentType<P>,
) => (APP_CONFIG.sentryEnabled ? Sentry.wrap(component) : component);
