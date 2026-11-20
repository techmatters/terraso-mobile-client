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

import {FeatureFlagControlPanel} from 'terraso-mobile-client/components/FeatureFlagControl';
import {MenuList} from 'terraso-mobile-client/components/menus/MenuList';
import {
  Box,
  Column,
  Heading,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByFlag} from 'terraso-mobile-client/components/restrictions/RestrictByFlag';
import {SafeScrollView} from 'terraso-mobile-client/components/safeview/SafeScrollView';
import {SessionReplayDebugContent} from 'terraso-mobile-client/components/SessionReplayDebugContent';
import {KvStorageEditor} from 'terraso-mobile-client/components/util/KvStorageEditor';
import {UiComponentList} from 'terraso-mobile-client/components/util/UiComponentList';
import {useUserDeletionRequests} from 'terraso-mobile-client/hooks/userDeletionRequest';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {ClearSoilIdCacheItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/ClearSoilIdCacheItem';
import {CopyAccessTokenItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/CopyAccessTokenItem';
import {DataExportItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/DataExportItem';
import {DeleteAccountItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/DeleteAccountItem';
import {HelpItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/HelpItem';
import {KeepAwakeToggleItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/KeepAwakeToggleItem';
import {PrivacyItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/PrivacyItem';
import {RawCaptureTestItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/RawCaptureTestItem';
import {SelectLanguageItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/SelectLanguageItem';
import {SignOutItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/SignOutItem';
import {TosItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/TosItem';
import {UseNewPreviewUxToggleItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/UseNewPreviewUxToggleItem';
import {UseRawWhenAvailableToggleItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/UseRawWhenAvailableToggleItem';
import {SoilImagesSection} from 'terraso-mobile-client/screens/UserSettingsScreen/components/SoilImagesSection';
import {UserIndicator} from 'terraso-mobile-client/screens/UserSettingsScreen/components/UserIndicatorComponent';
import {VersionIndicator} from 'terraso-mobile-client/screens/UserSettingsScreen/components/VersionIndicatorComponent';

// Small section heading for the DEV-only settings groups. Not promoted to a
// shared component yet because it's the only user. If more settings screens
// adopt the labelled-section pattern, extract into components/menus/.
const DevSectionHeading = ({label}: {label: string}) => (
  <Box pt="md" pl="xs">
    <Heading variant="h6">{label}</Heading>
  </Box>
);

export function UserSettingsScreen() {
  const {isPending} = useUserDeletionRequests();

  return (
    <ScreenScaffold AppBar={<AppBar LeftButton={null} RightButton={null} />}>
      <RestrictByFlag flag="FF_testing">
        <UiComponentList />
        <KvStorageEditor />
      </RestrictByFlag>
      <FeatureFlagControlPanel />
      <SessionReplayDebugContent />
      <SafeScrollView>
        <Column margin="12px">
          <UserIndicator />
          <MenuList>
            {!isPending && (
              <>
                <DataExportItem />
                <HelpItem />
                <PrivacyItem />
                <TosItem />
                <SelectLanguageItem />
              </>
            )}
            <SignOutItem />
            <DeleteAccountItem />
          </MenuList>
          {!isPending && (
            <RestrictByFlag flag="FF_testing">
              <DevSectionHeading label="Developer" />
              <MenuList>
                <CopyAccessTokenItem />
                <ClearSoilIdCacheItem />
                <KeepAwakeToggleItem />
              </MenuList>
              <DevSectionHeading label="Color / Camera" />
              <MenuList>
                <RawCaptureTestItem />
                <UseRawWhenAvailableToggleItem />
                <UseNewPreviewUxToggleItem />
              </MenuList>
              <DevSectionHeading label="Soil Images" />
              <SoilImagesSection />
            </RestrictByFlag>
          )}
          <VersionIndicator />
        </Column>
      </SafeScrollView>
    </ScreenScaffold>
  );
}
