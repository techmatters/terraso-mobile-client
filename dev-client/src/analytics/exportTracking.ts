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

import {getPostHogInstance} from 'terraso-mobile-client/app/posthogInstance';
import type {
  ExportScope,
  ResourceType,
} from 'terraso-mobile-client/model/export/exportTypes';

type ExportEvent =
  | 'export_file_download'
  | 'export_link_share'
  | 'export_link_reset';

type TrackExportProps = {
  event: ExportEvent;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  scope: ExportScope;
  format: 'csv' | 'json' | 'html';
};

/**
 * Track an export event in PostHog.
 *
 * @param event - The event name (export_file_download, export_link_share, export_link_reset)
 * @param resourceType - USER, PROJECT, or SITE
 * @param resourceId - The ID of the resource
 * @param resourceName - The name of the resource
 * @param scope - user_all, project, or site
 * @param format - csv, json, or html (use html for link exports)
 */
export function trackExport({
  event,
  resourceType,
  resourceId,
  resourceName,
  scope,
  format,
}: TrackExportProps) {
  const posthog = getPostHogInstance();
  if (!posthog) {
    return;
  }

  posthog.capture(event, {
    resource_type: resourceType,
    resource_id: resourceId,
    resource_name: resourceName,
    scope,
    format,
  });
}
