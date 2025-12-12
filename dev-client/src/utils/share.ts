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

import {Platform} from 'react-native';
import Share from 'react-native-share';

/**
 * Sanitize a name for use in a URL path.
 *
 * Converts spaces to hyphens, removes characters that are problematic
 * for URLs or filesystems, and leaves Unicode intact (clients auto-encode).
 *
 * @example
 * sanitizeNameForUrl("Project: Phase 1")  // "Project-Phase-1"
 * sanitizeNameForUrl("Київ Site")         // "Київ-Site"
 * sanitizeNameForUrl("What's Next?")      // "Whats-Next"
 */
export function sanitizeNameForUrl(name: string): string {
  return (
    name
      .trim()
      .replace(/\s+/g, '-') // spaces → hyphen
      .replace(/[/:]/g, '-') // path-like chars → hyphen
      .replace(/[<>"'\\|?*#&=%()]/g, '') // remove URL/filesystem problem chars
      .replace(/-{2,}/g, '-') // collapse multiple hyphens
      .replace(/^-+|-+$/g, '') || // trim leading/trailing hyphens
    'export' // fallback if empty
  );
}

/**
 * Shares a URL using the platform's native share sheet via react-native-share
 *
 * @param url - The URL to share (should be a .html URL for export pages)
 * @param message - Message to accompany the URL (used on Android, ignored on iOS)
 * @param title - Optional title for share dialog
 * @param subject - Optional email subject for email shares
 * @returns Promise that resolves when share sheet is dismissed
 */
export const shareUrl = async (
  url: string,
  message: string,
  title?: string,
  subject?: string,
): Promise<void> => {
  try {
    // Share URL with message for richer preview
    // iOS: url provides rich preview, message omitted to avoid duplicate content in iMessage
    // Android: message is required, so include message + url (encoded for valid links)
    await Share.open({
      url: Platform.OS === 'ios' ? url : undefined,
      message:
        Platform.OS === 'ios' ? undefined : `${message}\n\n${encodeURI(url)}\n`,
      title: title,
      subject: subject,
      failOnCancel: false,
    });
  } catch (error) {
    console.error('Error sharing URL:', error);
    throw error;
  }
};
