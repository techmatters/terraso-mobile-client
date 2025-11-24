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

import {useCallback, useEffect, useRef, useState} from 'react';
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
  selectExportIsLoading,
  selectExportToken,
  selectHasExportToken,
} from 'terraso-mobile-client/model/export/exportSelectors';
import {
  buildExportUrl,
  downloadUserData,
} from 'terraso-mobile-client/model/export/exportService';
import {
  createExportToken as createExportTokenAction,
  deleteExportToken as deleteExportTokenAction,
  fetchExportToken,
} from 'terraso-mobile-client/model/export/exportSlice';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ExportFileInfoSheet} from 'terraso-mobile-client/screens/DataExportScreen/components/ExportFileInfoSheet';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {AppState, useDispatch, useSelector} from 'terraso-mobile-client/store';
import {saveFileToDevice} from 'terraso-mobile-client/utils/fileDownload';
import {shareUrl} from 'terraso-mobile-client/utils/share';

export function DataExportScreen() {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const isOffline = useIsOffline();
  const confirmModalRef = useRef<ModalHandle>(null);
  const infoSheetRef = useRef<ModalHandle>(null);

  const token = useSelector(selectExportToken);
  const hasToken = useSelector(selectHasExportToken);
  const isLoading = useSelector(selectExportIsLoading);

  const [isDownloading, setIsDownloading] = useState(false);

  const currentUser = useSelector(state => state.account.currentUser?.data);
  const userId = currentUser?.id;
  const username = currentUser?.email?.split('@')[0] ?? 'user';

  // Check if any sites have US data region for conditional ecological site field
  const hasUSSites = useSelector((state: AppState) => {
    const matches = state.soilIdMatch.siteDataBasedMatches;
    return Object.values(matches).some(match => match?.dataRegion === 'US');
  });

  // Fetch token on mount
  useEffect(() => {
    if (userId) {
      dispatch(fetchExportToken(userId));
    }
  }, [dispatch, userId]);

  const handleShare = useCallback(
    async (format: 'csv' | 'json') => {
      // Create token if it doesn't exist
      let currentToken = token;
      if (!currentToken && userId) {
        const result = await dispatch(createExportTokenAction(userId));
        if (createExportTokenAction.fulfilled.match(result)) {
          currentToken = result.payload;
        } else {
          console.error('Failed to create export token');
          return;
        }
      }

      if (!currentToken?.token) return;

      const url = buildExportUrl(currentToken.token, username, format);
      const message = t('export.share_message', {name: username});

      try {
        await shareUrl(
          url,
          message,
          t('export.share_title', {name: username}),
          t('export.share_dialog_title', {name: username}),
          t('export.share_subject', {name: username}),
        );
      } catch (err) {
        console.error(`Failed to share ${format.toUpperCase()}:`, err);
      }
    },
    [token, userId, username, t, dispatch],
  );

  const handleDownload = useCallback(
    async (format: 'csv' | 'json') => {
      if (!userId) {
        console.error('No user ID available');
        return;
      }

      setIsDownloading(true);

      try {
        // Download file content from API
        const content = await downloadUserData(userId, username, format);

        // Clear loading indicator before showing share sheet
        setIsDownloading(false);
        99;
        // Save file to device
        const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
        const filename = `${username}.${format}`;

        const result = await saveFileToDevice(
          content,
          filename,
          mimeType,
          t('export.save_dialog_title', {name: username}),
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
    [userId, username, t],
  );

  const handleDownloadCSV = () => handleDownload('csv');
  const handleDownloadJSON = () => handleDownload('json');

  const handleResetLinksConfirm = useCallback(async () => {
    if (token?.token) {
      await dispatch(deleteExportTokenAction(token.token));
    }
  }, [dispatch, token]);

  return (
    <ScreenScaffold AppBar={<AppBar title={t('export.menu_title')} />}>
      <Column margin="16px" space="16px">
        {/* Title */}

        <Heading variant="h4">{t('export.title')}</Heading>

        {/* Always show this message */}
        <TranslatedParagraph i18nKey="export.offline_requirement" />

        {/* Loading State */}
        {(isLoading || isDownloading) && (
          <View>
            <ActivityIndicator size="large" />
            <Text>
              {isDownloading ? t('export.downloading') : t('export.loading')}
            </Text>
          </View>
        )}

        {/* Main Content */}
        {!isLoading && !isDownloading && (
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

              <TextButton
                leftIcon="share"
                onPress={() => handleShare('csv')}
                disabled={isOffline}
                label={t('export.share_csv')}
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

              <TextButton
                leftIcon="share"
                onPress={() => handleShare('json')}
                disabled={isOffline}
                label={t('export.share_json')}
              />
            </View>

            <Divider />

            {/* Reset Links Button */}
            <View>
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
    </ScreenScaffold>
  );
}
