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

export type SyncConflictInfo =
  | {
      reason: 'push';
      soilDataErrors: number;
      metadataErrors: number;
    }
  | {
      reason: 'missing_data';
      missingEntityType: string;
    }
  | {
      reason: 'other';
    };

/**
 * Use posthog to track when a sync conflict error dialog is shown to the user.
 */
export function trackSyncError(info: SyncConflictInfo) {
  const posthog = getPostHogInstance();
  if (!posthog) {
    return;
  }

  const properties: Record<string, string | number> = {
    error_reason: info.reason,
  };

  if (info.reason === 'push') {
    properties.soil_data_error_count = info.soilDataErrors;
    properties.metadata_error_count = info.metadataErrors;
  } else if (info.reason === 'missing_data') {
    properties.missing_entity_type = info.missingEntityType;
  }

  posthog.capture('sync_conflict', properties);
}
