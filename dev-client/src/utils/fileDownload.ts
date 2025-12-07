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

import {Platform} from 'react-native';

import * as FileSystem from 'expo-file-system';
import {
  cacheDirectory,
  documentDirectory,
  StorageAccessFramework,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {useTranslation} from 'react-i18next';

export type SaveFileResult =
  | {success: true; filename: string}
  | {success: false; error: string; canceled?: boolean};

type TranslateFn = ReturnType<typeof useTranslation>['t'];

/**
 * Gets the appropriate UTI (Uniform Type Identifier) for iOS based on MIME type
 * UTIs help iOS identify file types and suggest appropriate apps in the share sheet
 */
const getUTIForMimeType = (mimeType: string): string => {
  switch (mimeType) {
    case 'text/csv':
      return 'public.comma-separated-values-text';
    case 'application/json':
      return 'public.json';
    default:
      return 'public.item'; // Generic fallback for unknown types
  }
};

/**
 * Saves a file to the device using the native file picker
 *
 * On iOS: Uses share sheet to let user save to Files, iCloud, etc.
 * On Android: Uses StorageAccessFramework to let user pick save location
 *
 * @param content - The file content as a string
 * @param filename - The desired filename (e.g., "data.csv")
 * @param mimeType - The MIME type (e.g., "text/csv" or "application/json")
 * @param t - Translation function for error messages
 * @param dialogTitle - Optional title for the share dialog
 * @returns Result indicating success or failure with translated error message
 */
export const saveFileToDevice = async (
  content: string,
  filename: string,
  mimeType: string,
  t: TranslateFn,
  dialogTitle?: string,
): Promise<SaveFileResult> => {
  try {
    if (Platform.OS === 'ios') {
      return await saveFileIOS(content, filename, mimeType, t, dialogTitle);
    } else if (Platform.OS === 'android') {
      return await saveFileAndroid(content, filename, mimeType, t, dialogTitle);
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
 * iOS implementation using share sheet
 * Due to iOS sandboxing, we save to app directory then use share sheet
 * which allows user to save to Files, iCloud, or other locations
 */
const saveFileIOS = async (
  content: string,
  filename: string,
  mimeType: string,
  t: TranslateFn,
  dialogTitle?: string,
): Promise<SaveFileResult> => {
  try {
    // Use cache directory as fallback if documentDirectory is not available
    const baseDirectory = documentDirectory || cacheDirectory;

    if (!baseDirectory) {
      return {
        success: false,
        error: t('file_download.error.no_storage_directory'),
      };
    }

    // Save file to app's directory first
    const fileUri = `${baseDirectory}${filename}`;

    await writeAsStringAsync(fileUri, content);

    // Check if sharing is available
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      return {
        success: false,
        error: t('file_download.error.sharing_unavailable'),
      };
    }

    // Open share sheet (user can save to Files, iCloud, etc.)
    // Note: shareAsync waits for user to dismiss share sheet before returning
    await Sharing.shareAsync(fileUri, {
      UTI: getUTIForMimeType(mimeType), // iOS-specific file type identifier
      mimeType: mimeType,
      dialogTitle: dialogTitle, // iOS only - shows as share sheet title
    });

    return {
      success: true,
      filename,
    };
  } catch (error) {
    console.error('[FileDownload] iOS save error:', error);

    // Check if user canceled
    if (
      error instanceof Error &&
      (error.message.includes('cancel') || error.message.includes('abort'))
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
 * Android implementation using StorageAccessFramework
 */
const saveFileAndroid = async (
  content: string,
  filename: string,
  mimeType: string,
  t: TranslateFn,
  dialogTitle?: string,
): Promise<SaveFileResult> => {
  try {
    // Check if SAF is available (Android 11+)
    // @ts-expect-error - StorageAccessFramework is in legacy API not main export
    if (!FileSystem.StorageAccessFramework) {
      // Fallback to share sheet for older Android versions
      return await saveFileFallback(
        content,
        filename,
        mimeType,
        t,
        dialogTitle,
      );
    }

    // Request directory permissions first
    const permissions =
      await StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permissions.granted) {
      return {
        success: false,
        error: t('file_download.error.no_directory_selected'),
        canceled: true,
      };
    }

    // Create file in selected directory
    const fileUri = await StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      filename,
      mimeType,
    );

    // Write content to the selected file
    await StorageAccessFramework.writeAsStringAsync(fileUri, content);

    return {
      success: true,
      filename,
    };
  } catch (error) {
    // Check if user canceled
    if (
      error instanceof Error &&
      (error.message.includes('cancel') || error.message.includes('abort'))
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
 * Fallback implementation using share sheet
 * Used when StorageAccessFramework is not available
 */
const saveFileFallback = async (
  content: string,
  filename: string,
  mimeType: string,
  t: TranslateFn,
  dialogTitle?: string,
): Promise<SaveFileResult> => {
  try {
    // Use cache directory as fallback if documentDirectory is not available
    const baseDirectory = documentDirectory || cacheDirectory;

    if (!baseDirectory) {
      return {
        success: false,
        error: t('file_download.error.no_storage_directory'),
      };
    }

    // Save file to app's directory first
    const fileUri = `${baseDirectory}${filename}`;
    await writeAsStringAsync(fileUri, content);

    // Check if sharing is available
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      return {
        success: false,
        error: t('file_download.error.sharing_unavailable'),
      };
    }

    // Open share sheet
    await Sharing.shareAsync(fileUri, {
      mimeType: mimeType,
      dialogTitle: dialogTitle,
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
