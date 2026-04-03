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

import {getPostHogInstance} from 'terraso-mobile-client/app/posthog/posthogInstance';
import type {PushUserDataResults} from 'terraso-mobile-client/model/sync/actions/syncActions';

export type PushFailureEntry = {
  siteName: string;
  reason: string;
};

/**
 * Use posthog to track individual push failure reasons by site.
 */
export function trackPushFailures(
  type: 'site' | 'soil_data' | 'soil_metadata',
  failures: PushFailureEntry[],
) {
  const posthog = getPostHogInstance();
  if (!posthog) {
    return;
  }

  posthog.capture(`${type}_push_failure`, {failures});
}

/**
 * Extract push failure reasons from a push result and track them in PostHog.
 * Returns true if any failures were tracked.
 */
export function trackPushResults(
  results: PushUserDataResults | undefined,
  getSiteName: (siteId: string) => string,
): boolean {
  if (!results) {
    return false;
  }

  const toFailures = (errors: Record<string, {value: string}>) =>
    Object.entries(errors).map(([siteId, {value: reason}]) => ({
      siteName: getSiteName(siteId),
      reason,
    }));

  let hasErrors = false;

  if (
    results.siteResults &&
    Object.keys(results.siteResults.errors).length > 0
  ) {
    trackPushFailures('site', toFailures(results.siteResults.errors));
    hasErrors = true;
  }
  if (
    results.soilDataResults &&
    Object.keys(results.soilDataResults.errors).length > 0
  ) {
    trackPushFailures('soil_data', toFailures(results.soilDataResults.errors));
    hasErrors = true;
  }
  if (
    results.soilMetadataResults &&
    Object.keys(results.soilMetadataResults.errors).length > 0
  ) {
    trackPushFailures(
      'soil_metadata',
      toFailures(results.soilMetadataResults.errors),
    );
    hasErrors = true;
  }

  return hasErrors;
}
