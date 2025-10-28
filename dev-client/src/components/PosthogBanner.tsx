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

import {useCallback, useEffect, useState} from 'react';

import {useFocusEffect} from '@react-navigation/native';
import {useFeatureFlag, usePostHog} from 'posthog-react-native';

import {CloseButton} from 'terraso-mobile-client/components/buttons/icons/common/CloseButton';
import {
  Box,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

const DISMISSED_BANNER_KEY = 'posthog.banner.dismissed';

const PosthogBannerContent = () => {
  const showBanner = useFeatureFlag('banner_message');
  const [message, setMessage] = useState<string | null>(null);
  const [currentPayload, setCurrentPayload] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const posthog = usePostHog();
  const [dismissedPayload, setDismissedPayload] = kvStorage.useString(
    DISMISSED_BANNER_KEY,
    '',
  );

  // Reload feature flags when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[PosthogBanner] Screen focused, reloading feature flags');
      posthog?.reloadFeatureFlags();
      // Trigger polling
      setRefreshKey(prev => prev + 1);
    }, [posthog]),
  );

  useEffect(() => {
    if (!showBanner) {
      setMessage(null);
      return;
    }

    if (!posthog) {
      return;
    }

    const checkForUpdate = () => {
      const payload = posthog.getFeatureFlagPayload('banner_message');

      if (!payload) {
        setMessage(null);
        setCurrentPayload(null);
        return;
      }

      try {
        const parsed =
          typeof payload === 'string' ? JSON.parse(payload) : payload;
        const newMessage = parsed?.message || null;
        const payloadString = JSON.stringify(parsed);

        setMessage(newMessage);
        setCurrentPayload(payloadString);
      } catch (error) {
        console.error('[PosthogBanner] Failed to parse payload:', error);
        setMessage(null);
        setCurrentPayload(null);
      }
    };

    // Check immediately
    checkForUpdate();

    // Poll every 1 second for 30 seconds
    const pollInterval = setInterval(checkForUpdate, 1000);

    // Stop polling after 30 seconds
    const stopTimeout = setTimeout(() => {
      clearInterval(pollInterval);
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(stopTimeout);
    };
  }, [showBanner, refreshKey, posthog]);

  const handleDismiss = useCallback(() => {
    if (currentPayload) {
      setDismissedPayload(currentPayload);
    }
  }, [currentPayload, setDismissedPayload]);

  // Don't show if no message or if current payload matches dismissed payload
  if (!message || !currentPayload || currentPayload === dismissedPayload) {
    return null;
  }

  return (
    <Box
      backgroundColor="background.default"
      padding="md"
      borderTopWidth="2px"
      borderColor="gray.300">
      <Row justifyContent="space-between" alignItems="center">
        <Box flex={1} pr="sm">
          <Text color="text.primary">{parseFormattedText(message)}</Text>
        </Box>
        <CloseButton onPress={handleDismiss} />
      </Row>
    </Box>
  );
};

type TextSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

function parseFormattedText(message: string): React.ReactNode {
  const segments: TextSegment[] = [];
  let currentBold = false;
  let currentItalic = false;
  let currentText = '';

  // Split by tags while preserving them
  const parts = message.split(/(<\/?[bi]>)/g);

  for (const part of parts) {
    if (part === '<b>') {
      if (currentText) {
        segments.push({
          text: currentText,
          bold: currentBold,
          italic: currentItalic,
        });
        currentText = '';
      }
      currentBold = true;
    } else if (part === '</b>') {
      if (currentText) {
        segments.push({
          text: currentText,
          bold: currentBold,
          italic: currentItalic,
        });
        currentText = '';
      }
      currentBold = false;
    } else if (part === '<i>') {
      if (currentText) {
        segments.push({
          text: currentText,
          bold: currentBold,
          italic: currentItalic,
        });
        currentText = '';
      }
      currentItalic = true;
    } else if (part === '</i>') {
      if (currentText) {
        segments.push({
          text: currentText,
          bold: currentBold,
          italic: currentItalic,
        });
        currentText = '';
      }
      currentItalic = false;
    } else if (part) {
      currentText += part;
    }
  }

  // Add any remaining text
  if (currentText) {
    segments.push({
      text: currentText,
      bold: currentBold,
      italic: currentItalic,
    });
  }

  // Render segments, handling newlines
  return segments.map((segment, index) => {
    // Split by newlines
    const lines = segment.text.split('\n');
    return lines.map((line, lineIndex) => {
      const style: {fontWeight?: 'bold'; fontStyle?: 'italic'} = {};
      if (segment.bold) style.fontWeight = 'bold';
      if (segment.italic) style.fontStyle = 'italic';

      return (
        <Text key={`${index}-${lineIndex}`} {...style}>
          {line}
          {lineIndex < lines.length - 1 ? '\n' : ''}
        </Text>
      );
    });
  });
}

export const PosthogBanner = () => {
  const posthog = usePostHog();

  // Return null if PostHog is not available (e.g., in tests or when disabled)
  if (!posthog) {
    return null;
  }

  return <PosthogBannerContent />;
};
