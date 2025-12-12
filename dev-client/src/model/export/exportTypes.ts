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

export type ResourceType = 'USER' | 'PROJECT' | 'SITE';

/**
 * Export scope used in API URLs.
 * Note: USER resource type can map to either 'user_all' or 'user_owned' scope.
 */
export type ExportScope = 'user_all' | 'user_owned' | 'project' | 'site';

export type ExportToken = {
  token: string;
  resourceType: ResourceType;
  resourceId: string;
  userId?: string;
};
