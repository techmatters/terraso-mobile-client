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

import {useCallback, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator, Alert, View} from 'react-native';
import {Divider} from 'react-native-paper';

import {TextButton} from 'terraso-mobile-client/components/buttons/TextButton';
import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {InternalLink} from 'terraso-mobile-client/components/links/InternalLink';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {
  Column,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {
  selectExportToken,
  selectHasExportToken,
} from 'terraso-mobile-client/model/export/exportSelectors';
import * as exportService from 'terraso-mobile-client/model/export/exportService';
import {
  createExportToken,
  deleteExportToken,
} from 'terraso-mobile-client/model/export/exportSlice';
import type {ResourceType} from 'terraso-mobile-client/model/export/exportTypes';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ExportFileInfoSheet} from 'terraso-mobile-client/screens/DataExportScreen/components/ExportFileInfoSheet';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {AppState, useDispatch, useSelector} from 'terraso-mobile-client/store';
import {saveFileToDevice} from 'terraso-mobile-client/utils/fileDownload';
import {shareUrl} from 'terraso-mobile-client/utils/share';

export type DataExportScreenProps = {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  /** Set to true when used in a tab navigator (no AppBar needed) */
  isTab?: boolean;
};

export function DataExportScreen({
  resourceType,
  resourceId,
  resourceName,
  isTab = false,
}: DataExportScreenProps) {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const isOffline = useIsOffline();
  const confirmModalRef = useRef<ModalHandle>(null);
  const infoSheetRef = useRef<ModalHandle>(null);

  const [isDownloading, setIsDownloading] = useState(false);

  // Get token from Redux - fetched during sync
  const token = useSelector((state: AppState) =>
    selectExportToken(state, resourceType, resourceId),
  );
  const hasToken = useSelector((state: AppState) =>
    selectHasExportToken(state, resourceType, resourceId),
  );

  // Check if any sites have US data region for conditional ecological site field
  const hasUSSites = useSelector((state: AppState) => {
    const matches = state.soilIdMatch.siteDataBasedMatches;
    return Object.values(matches).some(match => match?.dataRegion === 'US');
  });

  const handleShare = useCallback(
    async (format: 'csv' | 'json') => {
      console.log(
        '[Export] handleShare called with format:',
        format,
        'token:',
        token,
      );

      let currentToken = token;

      // Create token if it doesn't exist
      if (!currentToken) {
        console.log('[Export] No token exists, creating new token...');
        const result = await dispatch(
          createExportToken({resourceType, resourceId}),
        );

        if (createExportToken.fulfilled.match(result)) {
          // Backend returns all tokens, need to extract ours from Redux
          // Token will be in Redux now, but we need to build URL immediately
          // Get the newly created token from the payload
          const tokens = result.payload;
          const newToken = tokens.find(
            tokenData =>
              tokenData.resourceType === resourceType &&
              tokenData.resourceId === resourceId,
          );
          if (!newToken) {
            console.error('[Export] Token not found in response');
            Alert.alert(
              t('export.create_token_error_title'),
              t('export.create_token_error_message'),
              [{text: t('general.dismiss')}],
            );
            return;
          }
          currentToken = newToken.token;
          console.log('[Export] Token created successfully:', currentToken);
        } else {
          console.error('[Export] Failed to create export token:', result);
          Alert.alert(
            t('export.create_token_error_title'),
            t('export.create_token_error_message'),
            [{text: t('general.dismiss')}],
          );
          return;
        }
      }

      if (!currentToken) {
        console.error(
          '[Export] No valid token available after creation attempt',
        );
        return;
      }

      const url = exportService.buildExportUrl(
        currentToken,
        resourceName,
        resourceType,
        format,
      );

      try {
        // Share just the URL - iOS shows rich preview, Android falls back to URL text
        await shareUrl(
          url,
          undefined, // No message - iOS shows just rich preview, Android gets URL as fallback
          t('export.share_title', {name: resourceName}),
          t('export.share_dialog_title', {name: resourceName}),
          t('export.share_subject', {name: resourceName}),
        );
      } catch (err) {
        console.error(`Failed to share ${format.toUpperCase()}:`, err);
      }
    },
    [token, resourceType, resourceId, resourceName, t, dispatch],
  );

  const handleDownload = useCallback(
    async (format: 'csv' | 'json') => {
      setIsDownloading(true);

      try {
        // Download file content from API
        const content = await exportService.downloadResourceData(
          resourceType,
          resourceId,
          resourceName,
          format,
        );

        // Clear loading indicator before showing share sheet
        setIsDownloading(false);

        // Save file to device
        const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
        const filename = `${resourceName}.${format}`;

        const result = await saveFileToDevice(
          content,
          filename,
          mimeType,
          t('export.save_dialog_title', {name: resourceName}),
        );

        // Don't show success alert - user gets feedback from the share sheet itself
        if (result.success) {
          return;
        }

        // Handle failure cases - destructure to help TypeScript
        const {canceled, error} = result as {
          success: false;
          error: string;
          canceled?: boolean;
        };

        if (canceled) {
          console.log('Save canceled by user');
        } else {
          Alert.alert(
            t('export.save_error_title'),
            t('export.save_error_message', {error}),
            [{text: t('general.dismiss')}],
          );
        }
      } catch (err) {
        console.error(`Failed to save ${format.toUpperCase()}:`, err);
        Alert.alert(
          t('export.save_error_title'),
          t('export.save_error_message', {
            error: err instanceof Error ? err.message : 'Unknown error',
          }),
          [{text: t('general.dismiss')}],
        );
      } finally {
        setIsDownloading(false);
      }
    },
    [resourceType, resourceId, resourceName, t],
  );

  const handleDownloadCSV = () => handleDownload('csv');
  const handleDownloadJSON = () => handleDownload('json');

  const handleResetLinksConfirm = useCallback(async () => {
    if (token) {
      const result = await dispatch(deleteExportToken(token));

      if (deleteExportToken.rejected.match(result)) {
        console.error('[Export] Failed to delete token:', result);
        Alert.alert(
          t('export.delete_token_error_title'),
          t('export.delete_token_error_message'),
          [{text: t('general.dismiss')}],
        );
      }
      // If successful, Redux state is automatically updated with remaining tokens
    }
  }, [token, t, dispatch]);

  const content = (
    <>
      <Column margin="16px" space="16px">
        {/* Title */}
        {!isTab && <Heading variant="h4">{t('export.title')}</Heading>}

        {/* Always show this message */}
        <TranslatedParagraph i18nKey="export.offline_requirement" />

        {/* Loading State */}
        {isDownloading && (
          <View>
            <ActivityIndicator size="large" />
            <Text>{t('export.downloading')}</Text>
          </View>
        )}

        {/* Main Content */}
        {!isDownloading && (
          <>
            {/* What is in the file? section */}
            <InternalLink
              onPress={() => infoSheetRef.current?.onOpen()}
              label={t('export.what_is_in_file')}
            />

            <Divider />

            {/* CSV Section */}
            <View>
              <TranslatedParagraph i18nKey="export.csv_description" mb="16px" />

              <TextButton
                leftIcon="download"
                onPress={handleDownloadCSV}
                disabled={isOffline || isDownloading}
                label={t('export.download_csv')}
              />
            </View>

            <Divider />

            {/* JSON Section */}
            <View>
              <TranslatedParagraph
                i18nKey="export.json_description"
                mb="16px"
              />

              <TextButton
                leftIcon="download"
                onPress={handleDownloadJSON}
                disabled={isOffline || isDownloading}
                label={t('export.download_json')}
              />
            </View>

            <Divider />

            {/* Link Sharing Section */}
            <View>
              <TranslatedParagraph
                i18nKey="export.link_description"
                mb="16px"
              />

              <TextButton
                leftIcon="share"
                onPress={() => handleShare('csv')}
                disabled={isOffline}
                label={t('export.share_link')}
              />

              {/* Reset Links Button */}
              <TextButton
                type="destructive"
                leftIcon="refresh"
                onPress={() => confirmModalRef.current?.onOpen()}
                disabled={isOffline || !hasToken}
                label={t('export.reset_links')}
              />
            </View>
          </>
        )}
      </Column>

      {/* Confirm Reset Modal */}
      <ConfirmModal
        ref={confirmModalRef}
        title={t('export.reset_links_title')}
        body={t('export.reset_links_body')}
        actionLabel="Reset links"
        handleConfirm={handleResetLinksConfirm}
      />

      {/* Export File Info Sheet */}
      <ExportFileInfoSheet ref={infoSheetRef} includeUSFields={hasUSSites} />
    </>
  );

  if (isTab) {
    return content;
  }

  return (
    <ScreenScaffold AppBar={<AppBar title={t('export.menu_title')} />}>
      {content}
    </ScreenScaffold>
  );
}
