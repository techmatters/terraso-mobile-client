/*
 * Copyright © 2026 Technology Matters
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

import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {OutlinedButton} from 'terraso-mobile-client/components/buttons/OutlinedButton';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {MenuList} from 'terraso-mobile-client/components/menus/MenuList';
import {
  Box,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  SoilImageDepth,
  SoilImageQueueEntry,
} from 'terraso-mobile-client/model/rawColor/soilImageQueue';
import {
  soilImageQueue,
  useSoilImageQueue,
} from 'terraso-mobile-client/model/rawColor/soilImageQueue.default';

// Settings → Soil Images section. DEV-only (gated at the parent in
// UserSettingsScreen via RestrictByFlag FF_testing).
//
// Visible when there are entries OR when at least one of the actions is
// usable. Shows per-entry status (queued / uploading / failed) with site
// label + depth. Clear is immediate (no confirm, per color-final-plan.md).
// Upload is intentionally stubbed off until the client-shared schema
// re-generates with requestSoilImageUploadUrl — flagging the state in the
// button copy so the dev tester knows why it's inert.

const TRUNCATE_CHARS = 28;

const truncateSite = (name: string): string =>
  name.length > TRUNCATE_CHARS ? `${name.slice(0, TRUNCATE_CHARS - 1)}…` : name;

const formatDepth = (depth: SoilImageDepth): string =>
  `${depth.start}–${depth.end} cm`;

const statusIcon = (entry: SoilImageQueueEntry) => {
  switch (entry.status) {
    case 'uploading':
      return <ActivityIndicator accessibilityLabel="uploading" />;
    case 'failed':
      return <Icon name="error-outline" />;
    case 'queued':
      return null;
  }
};

const QueueRow = ({entry}: {entry: SoilImageQueueEntry}) => {
  const label = `${truncateSite(entry.siteName)} · ${formatDepth(entry.depth)}`;
  const subLabel = entry.status === 'failed' ? entry.failureReason : undefined;
  return (
    <MenuItem
      variant="default"
      label={label}
      subLabel={subLabel}
      icon={<View style={styles.statusCell}>{statusIcon(entry)}</View>}
    />
  );
};

export const SoilImagesSection = () => {
  const {t} = useTranslation();
  const entries = useSoilImageQueue();

  const onClear = useCallback(() => {
    // No confirmation modal — per color-final-plan.md "clear: no confirm".
    soilImageQueue.clear();
  }, []);

  if (entries.length === 0) {
    return (
      <Box pt="sm" pl="md" pr="md">
        <Text color="text.secondary" italic>
          {t('colorCamera.soilImages.empty')}
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <MenuList>
        {entries.map(e => (
          <QueueRow key={e.id} entry={e} />
        ))}
      </MenuList>
      <Row space="sm" pl="md" pr="md" pt="sm">
        <OutlinedButton
          label={t('colorCamera.soilImages.clear')}
          onPress={onClear}
        />
        <ContainedButton
          label={t('colorCamera.soilImages.uploadUnavailable')}
          disabled
        />
      </Row>
    </Box>
  );
};

const styles = StyleSheet.create({
  statusCell: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
