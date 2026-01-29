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

import CryptoJS from 'crypto-js';

import {APP_CONFIG} from 'terraso-mobile-client/config';

// ---- Session Recording Config Fetch ----
// Fetches session recording configuration from Cloudflare Worker
// Uses HMAC-SHA256 signed requests for authentication

export type SessionRecordingConfig = {
  enabledBuilds: string[]; // Build patterns: exact (999), range (100-200), min (300-), max (-500)
  enabledEmails: string[];
};

// Timeout for fetching config from Cloudflare (in ms)
const FETCH_TIMEOUT_MS = 3000;

/**
 * Compute HMAC-SHA256 of message using secret, return as hex string
 */
function computeHmac(message: string, secret: string): string {
  const hash = CryptoJS.HmacSHA256(message, secret);
  return hash.toString(CryptoJS.enc.Hex);
}

/**
 * Fetch session recording config from Cloudflare Worker with signed request
 * Returns null if fetch fails, times out, or config is not configured
 */
export async function fetchSessionRecordingConfig(): Promise<SessionRecordingConfig | null> {
  const url = APP_CONFIG.featureFlagUrl;
  const secret = APP_CONFIG.featureFlagSecret;

  console.log('[SessionRecordingConfig] Checking config:', {
    featureFlagUrl: url ?? '(undefined)',
    featureFlagSecret: secret ? `(set, ${secret.length} chars)` : '(undefined)',
  });

  // Skip if not configured
  if (!url || !secret) {
    console.log(
      '[SessionRecordingConfig] Cloudflare config not set, skipping fetch',
    );
    return null;
  }

  try {
    // Generate timestamp and signature
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = computeHmac(timestamp, secret);

    // Build URL with signed params
    const requestUrl = `${url}?t=${timestamp}&sig=${signature}`;

    console.log('[SessionRecordingConfig] Fetching config from Cloudflare...', {
      url,
      timestamp,
      signatureLength: signature.length,
      signaturePrefix: signature.substring(0, 16) + '...',
    });

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(requestUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(
          '[SessionRecordingConfig] Fetch failed with status:',
          response.status,
        );
        return null;
      }

      const config = (await response.json()) as SessionRecordingConfig;
      console.log('[SessionRecordingConfig] Fetched config:', config);
      return config;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if ((fetchError as Error).name === 'AbortError') {
        console.log('[SessionRecordingConfig] Fetch timed out');
      } else {
        console.log('[SessionRecordingConfig] Fetch error:', fetchError);
      }
      return null;
    }
  } catch (error) {
    console.log('[SessionRecordingConfig] Error:', error);
    return null;
  }
}
