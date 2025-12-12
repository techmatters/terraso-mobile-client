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

import {buildTokenKey} from 'terraso-mobile-client/model/export/exportSlice';
import type {ResourceType} from 'terraso-mobile-client/model/export/exportTypes';
import {AppState} from 'terraso-mobile-client/store';

/**
 * Selects the export token for a specific resource
 * @param state - Redux state
 * @param resourceType - The type of resource (USER, PROJECT, or SITE)
 * @param resourceId - The ID of the resource
 * @returns The export token string if it exists, null otherwise
 */
export const selectExportToken = (
  state: AppState,
  resourceType: ResourceType,
  resourceId: string,
): string | null => {
  const key = buildTokenKey(resourceType, resourceId);
  return state.export.tokens[key] ?? null;
};

/**
 * Selects whether an export token exists for a specific resource
 * @param state - Redux state
 * @param resourceType - The type of resource (USER, PROJECT, or SITE)
 * @param resourceId - The ID of the resource
 * @returns True if a token exists for this resource, false otherwise
 */
export const selectHasExportToken = (
  state: AppState,
  resourceType: ResourceType,
  resourceId: string,
): boolean => {
  return selectExportToken(state, resourceType, resourceId) !== null;
};

/**
 * Selects all export tokens
 * @param state - Redux state
 * @returns Dictionary of all export tokens keyed by "RESOURCE_TYPE:resourceId"
 */
export const selectAllExportTokens = (
  state: AppState,
): Record<string, string> => {
  return state.export.tokens;
};
