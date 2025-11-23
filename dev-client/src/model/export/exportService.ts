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

import type {ExportToken} from 'terraso-mobile-client/model/export/exportTypes';

const EXPORT_TOKEN_QUERY = `
  query ExportToken($resourceType: ResourceTypeEnum!, $resourceId: ID!) {
    exportToken(resourceType: $resourceType, resourceId: $resourceId) {
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
      token {
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
      success
    }
  }
`;

/**
 * Fetches the current user's export token
 * @param userId - The current user's ID
 * @returns The export token if it exists, null otherwise
 */
export const fetchExportToken = async (
  userId: string,
): Promise<ExportToken | null> => {
  console.log('[Export] fetchExportToken called with userId:', userId);
  const response: any = await terrasoApi.requestGraphQL(EXPORT_TOKEN_QUERY, {
    resourceType: 'USER',
    resourceId: userId,
  });
  console.log('[Export] fetchExportToken response:', response);
  return response.exportToken ?? null;
};

/**
 * Creates a new export token for the current user
 * @param userId - The current user's ID
 * @returns The newly created export token
 */
export const createExportToken = async (
  userId: string,
): Promise<ExportToken> => {
  console.log('[Export] createExportToken called with userId:', userId);
  const response: any = await terrasoApi.requestGraphQL(
    CREATE_EXPORT_TOKEN_MUTATION,
    {
      resourceType: 'USER',
      resourceId: userId,
    },
  );
  console.log('[Export] createExportToken response:', response);

  if (!response.createExportToken?.token) {
    throw new Error('Failed to create export token');
  }

  return response.createExportToken.token;
};

/**
 * Deletes the current user's export token
 * @param token - The token to delete
 * @returns True if the deletion was successful, false otherwise
 */
export const deleteExportToken = async (token: string): Promise<boolean> => {
  const response: any = await terrasoApi.requestGraphQL(
    DELETE_EXPORT_TOKEN_MUTATION,
    {
      token,
    },
  );

  return response.deleteExportToken?.success ?? false;
};

/**
 * Builds the export URL for a given token and format
 * @param token - The export token
 * @param username - The username (from the token's resourceId)
 * @param format - The export format (csv or json)
 * @returns The full export URL
 */
export const buildExportUrl = (
  token: string,
  username: string,
  format: 'csv' | 'json',
): string => {
  const baseUrl = getAPIConfig().terrasoAPIURL;
  return `${baseUrl}/export/token/user_all/${token}/${username}.${format}`;
};

/**
 * Downloads user data directly from the API with authentication
 * @param userId - The current user's ID
 * @param username - The username for the filename
 * @param format - The export format (csv or json)
 * @returns The file content as a string
 */
export const downloadUserData = async (
  userId: string,
  username: string,
  format: 'csv' | 'json',
): Promise<string> => {
  const baseUrl = getAPIConfig().terrasoAPIURL;
  const url = `${baseUrl}/export/id/user_all/${userId}/${username}.${format}`;

  console.log('[Export] downloadUserData called with:', {
    userId,
    username,
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
