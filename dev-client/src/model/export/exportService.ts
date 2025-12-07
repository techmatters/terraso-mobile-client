/*
 * Copyright © 2024 Technology Matters
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

import {getAuthHeaders} from 'terraso-client-shared/account/auth';
import {getAPIConfig} from 'terraso-client-shared/config';
import * as terrasoApi from 'terraso-client-shared/terrasoApi/api';

import type {
  ExportToken,
  ResourceType,
} from 'terraso-mobile-client/model/export/exportTypes';

const ALL_EXPORT_TOKENS_QUERY = `
  query AllExportTokens {
    allExportTokens {
      token
      resourceType
      resourceId
      userId
    }
  }
`;

const CREATE_EXPORT_TOKEN_MUTATION = `
  mutation CreateExportToken($resourceType: ResourceTypeEnum!, $resourceId: ID!) {
    createExportToken(resourceType: $resourceType, resourceId: $resourceId) {
      tokens {
        token
        resourceType
        resourceId
        userId
      }
    }
  }
`;

const DELETE_EXPORT_TOKEN_MUTATION = `
  mutation DeleteExportToken($token: String!) {
    deleteExportToken(token: $token) {
      tokens {
        token
        resourceType
        resourceId
        userId
      }
    }
  }
`;

/**
 * Fetches all export tokens for the current user
 * @returns Array of all export tokens
 */
export const fetchAllExportTokens = async (): Promise<ExportToken[]> => {
  const response: any = await terrasoApi.requestGraphQL(
    ALL_EXPORT_TOKENS_QUERY,
  );
  console.log('[Export] fetchAllExportTokens response:', response);

  return response.allExportTokens;
};

/**
 * Creates a new export token for a given resource
 * @param resourceType - The type of resource (USER, PROJECT, or SITE)
 * @param resourceId - The ID of the resource
 * @returns Array of all export tokens after creation
 */
export const createExportToken = async (
  resourceType: ResourceType,
  resourceId: string,
): Promise<ExportToken[]> => {
  console.log('[Export] createExportToken called with:', {
    resourceType,
    resourceId,
  });
  const response: any = await terrasoApi.requestGraphQL(
    CREATE_EXPORT_TOKEN_MUTATION,
    {
      resourceType,
      resourceId,
    },
  );
  console.log('[Export] createExportToken response:', response);

  if (!response.createExportToken?.tokens) {
    throw new Error('Failed to create export token');
  }

  return response.createExportToken.tokens;
};

/**
 * Deletes an export token
 * @param token - The token to delete
 * @returns Array of all remaining export tokens after deletion
 */
export const deleteExportToken = async (
  token: string,
): Promise<ExportToken[]> => {
  console.log('[Export] deleteExportToken called with token:', token);
  const response: any = await terrasoApi.requestGraphQL(
    DELETE_EXPORT_TOKEN_MUTATION,
    {
      token,
    },
  );
  console.log('[Export] deleteExportToken response:', response);

  if (!response.deleteExportToken?.tokens) {
    throw new Error('Failed to delete export token');
  }

  return response.deleteExportToken.tokens;
};

/**
 * Builds the export URL for a given token and format
 * @param token - The export token
 * @param resourceName - The name to use in the filename (username, project name, or site name)
 * @param resourceType - The type of resource (USER, PROJECT, or SITE)
 * @param _format - The export format (csv or json) - not used, kept for API compatibility
 * @returns The full export URL ending in .html (for HTML page with download links)
 */
export const buildExportUrl = (
  token: string,
  resourceName: string,
  resourceType: ResourceType,
  _format: 'csv' | 'json',
): string => {
  const baseUrl = getAPIConfig().terrasoAPIURL;
  // USER uses "user_all", but PROJECT and SITE use just "project" and "site"
  const scope =
    resourceType === 'USER' ? 'user_all' : resourceType.toLowerCase();
  // Return URL ending with .html which will display an HTML page with download links
  return `${baseUrl}/export/token/${scope}/${token}/${resourceName}.html`;
};

/**
 * Downloads resource data directly from the API with authentication
 * @param resourceType - The type of resource (USER, PROJECT, or SITE)
 * @param resourceId - The ID of the resource
 * @param resourceName - The name to use in the filename
 * @param format - The export format (csv or json)
 * @returns The file content as a string
 */
export const downloadResourceData = async (
  resourceType: ResourceType,
  resourceId: string,
  resourceName: string,
  format: 'csv' | 'json',
): Promise<string> => {
  const baseUrl = getAPIConfig().terrasoAPIURL;
  // USER uses "user_all", but PROJECT and SITE use just "project" and "site"
  const scope =
    resourceType === 'USER' ? 'user_all' : resourceType.toLowerCase();
  const url = `${baseUrl}/export/id/${scope}/${resourceId}/${resourceName}.${format}`;

  console.log('[Export] downloadResourceData called with:', {
    resourceType,
    resourceId,
    resourceName,
    format,
    url,
  });

  const authHeaders = await getAuthHeaders();

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...authHeaders,
    },
  });

  if (!response.ok) {
    console.error(
      '[Export] Download failed:',
      response.status,
      response.statusText,
    );
    if (response.status === 401) {
      throw new Error('Unauthorized - please log in again');
    }
    throw new Error(
      `Failed to download: ${response.status} ${response.statusText}`,
    );
  }

  const content = await response.text();
  console.log('[Export] Download successful, content length:', content.length);

  return content;
};
