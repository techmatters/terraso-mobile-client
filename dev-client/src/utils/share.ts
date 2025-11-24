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

import {Share, ShareAction} from 'react-native';

/**
 * Shares a URL using the platform's native share sheet
 *
 * @param url - The URL to share
 * @param message - Optional message to include with the URL
 * @param title - Optional title for Android share dialog
 * @param dialogTitle - Optional dialog title for Android
 * @param subject - Optional email subject for iOS
 * @returns Promise that resolves to the share action result
 */
export const shareUrl = async (
  url: string,
  message?: string,
  title?: string,
  dialogTitle?: string,
  subject?: string,
): Promise<ShareAction> => {
  try {
    // Combine message and URL into a single text string
    // This is the most reliable way to share on both platforms
    const shareText = message ? `${message}\n\n"${url}"` : url;

    const result = await Share.share(
      {
        message: shareText,
        // url: url, not including this to avoid preview
        title: title,
      },
      {
        dialogTitle: dialogTitle,
        subject: subject, // iOS only

        // iOS only: Suggest Mail and Messages as share targets
        // excludedActivityTypes: [],
      },
    );

    return result;
  } catch (error) {
    console.error('Error sharing URL:', error);
    throw error;
  }
};
