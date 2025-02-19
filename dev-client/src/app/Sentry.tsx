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
  });
}

export const wrapSentry = <P extends Record<string, unknown>>(
  component: React.ComponentType<P>,
) => (APP_CONFIG.sentryEnabled ? Sentry.wrap(component) : component);
