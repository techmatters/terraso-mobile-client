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

import {useCallback, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {Divider, Modal as PaperModal, Portal} from 'react-native-paper';

import {trackExport} from 'terraso-mobile-client/analytics/exportTracking';
import {IconButton} from 'terraso-mobile-client/components/buttons/icons/IconButton';
import {TextButton} from 'terraso-mobile-client/components/buttons/TextButton';
import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {ErrorDialog} from 'terraso-mobile-client/components/dialogs/ErrorDialog';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {
  Box,
  Column,
  Heading,
  Row,
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
import type {
  ExportScope,
  ResourceType,
} from 'terraso-mobile-client/model/export/exportTypes';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ExportHelpSheet} from 'terraso-mobile-client/screens/DataExportScreen/components/ExportHelpSheet';
import {OfflineAlert} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/alertBoxes/OfflineAlert';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {AppState, useDispatch, useSelector} from 'terraso-mobile-client/store';
import {
  sanitizeFilename,
  shareOrSaveFile,
} from 'terraso-mobile-client/utils/fileDownload';
import {shareUrl} from 'terraso-mobile-client/utils/share';

export type DataExportScreenProps = {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  /** Export scope for API URLs (e.g., 'user_all', 'project', 'site') */
  scope: ExportScope;
  /** Set to true when used in a tab navigator (no AppBar needed) */
  isTab?: boolean;
};

export function DataExportScreen({
  resourceType,
  resourceId,
  resourceName,
  scope,
  isTab = false,
}: DataExportScreenProps) {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const isOffline = useIsOffline();
  const confirmModalRef = useRef<ModalHandle>(null);
  const infoSheetRef = useRef<ModalHandle>(null);
  const errorDialogRef = useRef<ModalHandle>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [errorType, setErrorType] = useState<
    'save' | 'create_link' | 'reset_link'
  >('save');

  const showError = useCallback(
    (type: 'save' | 'create_link' | 'reset_link') => {
      setErrorType(type);
      errorDialogRef.current?.onOpen();
    },
    [],
  );

  // Get token from Redux - fetched during sync
  const token = useSelector((state: AppState) =>
    selectExportToken(state, resourceType, resourceId),
  );
  const hasToken = useSelector((state: AppState) =>
    selectHasExportToken(state, resourceType, resourceId),
  );

  const handleShare = useCallback(
    async (format: 'csv' | 'json') => {
      let currentToken = token;

      // Create token if it doesn't exist
      if (!currentToken) {
        const result = await dispatch(
          createExportToken({resourceType, resourceId}),
        );

        if (createExportToken.fulfilled.match(result)) {
          // Redux state is updated, but our `token` variable still has the stale
          // value from before the dispatch. Extract the new token from the action
          // payload so we can use it immediately without waiting for a re-render.
          const tokens = result.payload;
          const newToken = tokens.find(
            tokenData =>
              tokenData.resourceType === resourceType &&
              tokenData.resourceId === resourceId,
          );
          if (!newToken) {
            console.error('[Export] Token not found in response');
            showError('create_link');
            return;
          }
          currentToken = newToken.token;
        } else {
          console.error('[Export] Failed to create export token:', result);
          showError('create_link');
          return;
        }
      }

      const url = exportService.buildExportUrl(
        currentToken,
        scope,
        resourceName,
      );

      try {
        // Track share event
        trackExport({
          event: 'export_link_share',
          resourceType,
          resourceId,
          resourceName,
          scope,
          format: 'html',
        });

        // Get resource-type-specific share message
        const shareMessageKey =
          `export.share_message_${resourceType.toLowerCase()}` as const;
        const shareMessage = t(shareMessageKey, {name: resourceName});

        await shareUrl(
          url,
          shareMessage,
          t('export.share_title', {name: resourceName}),
          t('export.share_subject', {name: resourceName}),
        );
      } catch (err) {
        console.error(`Failed to share ${format.toUpperCase()}:`, err);
      }
    },
    [
      token,
      resourceType,
      resourceId,
      resourceName,
      scope,
      t,
      dispatch,
      showError,
    ],
  );

  const handleDownload = useCallback(
    async (format: 'csv' | 'json') => {
      setIsDownloading(true);

      // Track download event
      trackExport({
        event: 'export_file_download',
        resourceType,
        resourceId,
        resourceName,
        scope,
        format,
      });

      try {
        // Download file content from API
        const content = await exportService.downloadResourceData(
          scope,
          resourceId,
          resourceName,
          format,
        );

        // Clear loading indicator before showing share sheet
        setIsDownloading(false);

        // Wait for modal dismiss animation to complete before showing native file picker.
        // Without this, the file picker can appear while the modal is still visible.
        // Using a timeout because InteractionManager.runAfterInteractions doesn't
        // account for the modal's fade-out animation.
        await new Promise(resolve => setTimeout(() => resolve(undefined), 300));

        // Save file to device
        const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
        const filename = `${sanitizeFilename(resourceName)}.${format}`;

        const result = await shareOrSaveFile(
          content,
          filename,
          mimeType,
          t,
          t('export.save_dialog_title', {name: resourceName}),
          t('export.share_subject', {name: resourceName}),
        );

        // Don't show success alert - user gets feedback from the share sheet itself
        if (result.success) {
          return;
        }

        // Handle failure cases - destructure to help TypeScript
        const {canceled} = result as {
          success: false;
          error: string;
          canceled?: boolean;
        };

        if (!canceled) {
          showError('save');
        }
      } catch (err) {
        console.error(`Failed to save ${format.toUpperCase()}:`, err);
        showError('save');
      } finally {
        setIsDownloading(false);
      }
    },
    [resourceType, scope, resourceId, resourceName, t, showError],
  );

  const handleDownloadCSV = () => handleDownload('csv');
  const handleDownloadJSON = () => handleDownload('json');

  const handleResetLinksConfirm = useCallback(async () => {
    if (token) {
      // Track reset event
      trackExport({
        event: 'export_link_reset',
        resourceType,
        resourceId,
        resourceName,
        scope,
        format: 'html',
      });

      const result = await dispatch(deleteExportToken(token));

      if (deleteExportToken.rejected.match(result)) {
        console.error('[Export] Failed to delete token:', result);
        showError('reset_link');
      }
      // If successful, Redux state is automatically updated with remaining tokens
    }
  }, [
    token,
    resourceType,
    resourceId,
    resourceName,
    scope,
    dispatch,
    showError,
  ]);

  const content = (
    <>
      <Column margin="16px" space="16px">
        {/* Title */}
        <Row alignItems="center">
          <Heading variant="h4">
            {t(`export.title_${resourceType.toLowerCase()}`)}
          </Heading>
          <Box ml="sm">
            <IconButton
              type="sm"
              name="info"
              onPress={() => infoSheetRef.current?.onOpen()}
            />
          </Box>
        </Row>

        {/* Show offline warning when disconnected */}
        {isOffline && <OfflineAlert message={t('export.offline_message')} />}

        {/* Save or Share File Section */}
        <View>
          <Heading variant="h6" fontWeight={700} mb="md">
            {t('export.save_or_share_file')}
          </Heading>

          <TranslatedParagraph i18nKey="export.file_description" mb="md" />

          <Column space="sm">
            <TextButton
              leftIcon="description"
              onPress={handleDownloadCSV}
              disabled={isOffline || isDownloading}
              label={t('export.csv_file')}
            />

            <TextButton
              leftIcon="description"
              onPress={handleDownloadJSON}
              disabled={isOffline || isDownloading}
              label={t('export.json_file')}
            />
          </Column>
        </View>

        <Divider />

        {/* Share Current Data Section */}
        <View>
          <Heading variant="h6" fontWeight={700} mb="md">
            {t('export.share_current_data')}
          </Heading>

          <TranslatedParagraph i18nKey="export.link_description" mb="md" />

          <Column space="sm">
            <TextButton
              leftIcon="link"
              onPress={() => handleShare('csv')}
              disabled={isOffline}
              label={t('export.live_link')}
            />

            <TextButton
              type="destructive"
              leftIcon="refresh"
              onPress={() => confirmModalRef.current?.onOpen()}
              disabled={isOffline || !hasToken}
              label={t('export.reset_live_link')}
            />
          </Column>
        </View>
      </Column>

      {/* Confirm Reset Modal */}
      <ConfirmModal
        ref={confirmModalRef}
        title={t('export.reset_links_title')}
        body={t('export.reset_links_body')}
        actionLabel="Reset links"
        handleConfirm={handleResetLinksConfirm}
      />

      {/* Export Help Sheet */}
      <ExportHelpSheet ref={infoSheetRef} />

      {/* Download Progress Modal */}
      <Portal>
        <PaperModal
          visible={isDownloading}
          dismissable={false}
          contentContainerStyle={styles.modalContainer}>
          <Box bg="$background" padding="lg" borderRadius={8}>
            <Column space="md" alignItems="center">
              <ActivityIndicator size="large" />
              <Heading variant="h6">
                {t('export.preparing_file', {
                  resourceType: resourceType.toLowerCase(),
                  name: resourceName,
                })}
              </Heading>
              <Text textAlign="center">
                {t('export.preparing_file_message')}
              </Text>
            </Column>
          </Box>
        </PaperModal>
      </Portal>
    </>
  );

  const errorDialog = (
    <ErrorDialog
      ref={errorDialogRef}
      headline={<TranslatedHeading i18nKey="export.error_headline" />}>
      <TranslatedParagraph i18nKey={`export.error_body_${errorType}`} />
    </ErrorDialog>
  );

  if (isTab) {
    return (
      <>
        {content}
        {errorDialog}
      </>
    );
  }

  return (
    <ScreenScaffold AppBar={<AppBar title={t('export.menu_title')} />}>
      {content}
      {errorDialog}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    padding: 20,
    margin: 20,
    borderRadius: 8,
    backgroundColor: 'white',
  },
});
