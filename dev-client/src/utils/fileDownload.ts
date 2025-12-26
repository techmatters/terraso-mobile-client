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

import {useTranslation} from 'react-i18next';
import {Platform} from 'react-native';
import Share from 'react-native-share';

import {File, Paths} from 'expo-file-system';
import {cacheDirectory, writeAsStringAsync} from 'expo-file-system/legacy';

export type SaveFileResult =
  | {success: true; filename: string}
  | {success: false; error: string; canceled?: boolean};

type TranslateFn = ReturnType<typeof useTranslation>['t'];

/**
 * Sanitizes a string to be safe for use as a filename.
 * Replaces characters that are invalid in filenames on various platforms.
 * Reserves space for extension to be added afterward (e.g., .json).
 */
export const sanitizeFilename = (name: string): string => {
  const MAX_LEN = 100; // Conservative limit; reserves space for .json extension

  const sanitized = name
    .normalize('NFC')
    .replace(/[/\\:*?"<>|]/g, '-')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .replace(/-+/g, '-');

  if (!sanitized) return 'file';

  return sanitized.substring(0, MAX_LEN);
};

/**
 * Shares or saves a file using the native share sheet or file picker
 *
 * On iOS: Uses share sheet to let user share via email, messaging, AirDrop,
 *         or save to Files, iCloud, etc.
 * On Android: Uses StorageAccessFramework to let user pick save location,
 *             or falls back to share sheet on older versions
 *
 * @param content - The file content as a string
 * @param filename - The desired filename (e.g., "data.csv")
 * @param mimeType - The MIME type (e.g., "text/csv" or "application/json")
 * @param t - Translation function for error messages
 * @param dialogTitle - Optional title for the share dialog
 * @param subject - Optional email subject for email shares
 * @returns Result indicating success or failure with translated error message
 */
export const shareOrSaveFile = async (
  content: string,
  filename: string,
  mimeType: string,
  t: TranslateFn,
  dialogTitle?: string,
  subject?: string,
): Promise<SaveFileResult> => {
  try {
    if (Platform.OS === 'ios') {
      return await saveFileIOS(
        content,
        filename,
        mimeType,
        t,
        dialogTitle,
        subject,
      );
    } else if (Platform.OS === 'android') {
      // Use share sheet on Android (same as iOS) to allow both sharing and saving
      return await saveFileFallback(
        content,
        filename,
        mimeType,
        t,
        dialogTitle,
      );
    } else {
      return {
        success: false,
        error: t('file_download.error.unsupported_platform'),
      };
    }
  } catch (error) {
    console.error('[FileDownload] Error saving file:', error);
    return {
      success: false,
      error: t('file_download.error.unknown'),
    };
  }
};

/**
 * iOS implementation using share sheet via react-native-share
 * Due to iOS sandboxing, we save to app directory then use share sheet
 * which allows user to save to Files, iCloud, or other locations
 */
const saveFileIOS = async (
  content: string,
  filename: string,
  mimeType: string,
  t: TranslateFn,
  dialogTitle?: string,
  subject?: string,
): Promise<SaveFileResult> => {
  // Save to cache directory for temporary files (cleaned by OS when storage is low)
  const fileUri = `${cacheDirectory}${filename}`;
  try {
    await writeAsStringAsync(fileUri, content);

    // Open share sheet using react-native-share
    // failOnCancel: false prevents promise rejection when user cancels
    await Share.open({
      url: fileUri,
      type: mimeType,
      filename: filename,
      subject: subject,
      title: dialogTitle,
      failOnCancel: false,
    });

    // On iOS, Share.open resolves after the share sheet is dismissed,
    // so it's safe to delete the temporary file now
    try {
      new File(Paths.cache, filename).delete();
    } catch {
      // Ignore deletion errors - file may not exist or already be deleted
    }

    return {
      success: true,
      filename,
    };
  } catch (error) {
    console.error('[FileDownload] iOS save error:', error);

    // Clean up temporary file on error
    try {
      new File(Paths.cache, filename).delete();
    } catch {
      // Ignore deletion errors
    }

    // Check if user canceled (react-native-share throws on cancel by default)
    if (
      error instanceof Error &&
      (error.message.includes('cancel') ||
        error.message.includes('abort') ||
        error.message.includes('User did not share'))
    ) {
      return {
        success: false,
        error: t('file_download.error.save_canceled'),
        canceled: true,
      };
    }

    return {
      success: false,
      error: t('file_download.error.save_failed'),
    };
  }
};

/**
 * Android implementation using share sheet via react-native-share
 * Shows share dialog allowing user to share via apps or save to device
 */
const saveFileFallback = async (
  content: string,
  filename: string,
  mimeType: string,
  t: TranslateFn,
  dialogTitle?: string,
): Promise<SaveFileResult> => {
  // Save to cache directory for temporary files (cleaned by OS when storage is low).
  // Note: On Android, we can't delete after Share.open because the promise
  // resolves before the share action completes. Files in cache will be
  // cleaned by the OS when storage is low.
  const fileUri = `${cacheDirectory}${filename}`;
  try {
    await writeAsStringAsync(fileUri, content);

    // Open share sheet using react-native-share
    await Share.open({
      url: fileUri,
      type: mimeType,
      filename: filename,
      title: dialogTitle,
      failOnCancel: false,
    });

    return {
      success: true,
      filename,
    };
  } catch (error) {
    console.error('[FileDownload] Fallback save error:', error);
    return {
      success: false,
      error: t('file_download.error.save_failed'),
    };
  }
};
