/*
 * Copyright © 2023 Technology Matters
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

import {
  RootStack,
  ScreenDefinitions,
} from 'terraso-mobile-client/navigation/types';
import {generateScreens} from 'terraso-mobile-client/navigation/utils/utils';
import {AddUserToProjectRoleScreen} from 'terraso-mobile-client/screens/AddUserToProjectScreen/AddUserToProjectRoleScreen';
import {AddUserToProjectScreen} from 'terraso-mobile-client/screens/AddUserToProjectScreen/AddUserToProjectScreen';
import {BottomTabsScreen} from 'terraso-mobile-client/screens/BottomTabsScreen';
import {ColorAnalysisScreen} from 'terraso-mobile-client/screens/ColorAnalysisScreen/ColorAnalysisScreen';
import {CreateProjectScreen} from 'terraso-mobile-client/screens/CreateProjectScreen/CreateProjectScreen';
import {CreateSiteScreen} from 'terraso-mobile-client/screens/CreateSiteScreen/CreateSiteScreen';
import {ProjectExportScreen} from 'terraso-mobile-client/screens/DataExportScreen/ProjectExportScreen';
import {SiteExportScreen} from 'terraso-mobile-client/screens/DataExportScreen/SiteExportScreen';
import {UserDataExportScreen} from 'terraso-mobile-client/screens/DataExportScreen/UserDataExportScreen';
import {DeleteAccountScreen} from 'terraso-mobile-client/screens/DeleteAccountScreen/DeleteAccountScreen';
import {EditPinnedNoteScreen} from 'terraso-mobile-client/screens/EditPinnedNoteScreen';
import {
  SiteSoilMatchInfoScreen,
  TemporaryLocationSoilMatchInfoScreen,
} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SoilMatchInfoScreen';
import {SiteLocationSoilIdScreen} from 'terraso-mobile-client/screens/LocationScreens/SiteLocationSoilIdScreen';
import {SiteTabsScreen} from 'terraso-mobile-client/screens/LocationScreens/SiteTabsScreen';
import {TemporaryLocationScreen} from 'terraso-mobile-client/screens/LocationScreens/TemporaryLocationScreen';
import {TemporaryLocationSoilIdScreen} from 'terraso-mobile-client/screens/LocationScreens/TemporaryLocationSoilIdScreen';
import {LoginScreen} from 'terraso-mobile-client/screens/LoginScreen';
import {ManageTeamMemberScreen} from 'terraso-mobile-client/screens/ManageTeamMemberScreen';
import {ProjectListScreen} from 'terraso-mobile-client/screens/ProjectListScreen/ProjectListScreen';
import {ProjectViewScreen} from 'terraso-mobile-client/screens/ProjectViewScreen/ProjectViewScreen';
import {AddSiteNoteScreen} from 'terraso-mobile-client/screens/SiteNotesScreen/AddSiteNoteScreen';
import {EditSiteNoteScreen} from 'terraso-mobile-client/screens/SiteNotesScreen/EditSiteNoteScreen';
import {ReadPinnedNoteScreen} from 'terraso-mobile-client/screens/SiteNotesScreen/ReadPinnedNoteScreen';
import {SiteSettingsScreen} from 'terraso-mobile-client/screens/SiteSettingsScreen/SiteSettingsScreen';
import {SitesScreen} from 'terraso-mobile-client/screens/SitesScreen/SitesScreen';
import {SiteTeamSettingsScreen} from 'terraso-mobile-client/screens/SiteTeamSettingsScreen';
import {SiteTransferProjectScreen} from 'terraso-mobile-client/screens/SiteTransferProjectScreen/SiteTransferProjectScreen';
import {SlopeMeterScreen} from 'terraso-mobile-client/screens/SlopeScreen/SlopeMeterScreen';
import {SlopeShapeScreen} from 'terraso-mobile-client/screens/SlopeScreen/SlopeShapeScreen';
import {SlopeSteepnessScreen} from 'terraso-mobile-client/screens/SlopeScreen/SlopeSteepnessScreen';
import {CarbonatesScreen} from 'terraso-mobile-client/screens/SoilScreen/CarbonatesScreen';
import {ColorGuideScreen} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/ColorGuideScreen';
import {ColorScreen} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/ColorScreen';
import {SoilSurfaceScreen} from 'terraso-mobile-client/screens/SoilScreen/components/SoilSurfaceScreen';
import {ConductivityScreen} from 'terraso-mobile-client/screens/SoilScreen/ConductivityScreen';
import {PhScreen} from 'terraso-mobile-client/screens/SoilScreen/PhScreen';
import {SARScreen} from 'terraso-mobile-client/screens/SoilScreen/SARScreen';
import {SOCSOMScreen} from 'terraso-mobile-client/screens/SoilScreen/SOCSOMScreen';
import {StructureScreen} from 'terraso-mobile-client/screens/SoilScreen/StructureScreen';
import {TextureGuideScreen} from 'terraso-mobile-client/screens/SoilScreen/TextureGuideScreen';
import {TextureScreen} from 'terraso-mobile-client/screens/SoilScreen/TextureScreen';
import {UserSettingsScreen} from 'terraso-mobile-client/screens/UserSettingsScreen/UserSettingsScreen';
import {WelcomeScreen} from 'terraso-mobile-client/screens/WelcomeScreen';

SiteLocationSoilIdScreen;

export const bottomTabScreensDefinitions = {
  PROJECT_LIST: ProjectListScreen,
  SITES: SitesScreen,
  SETTINGS: UserSettingsScreen,
} satisfies ScreenDefinitions;

export const screenDefinitions = {
  WELCOME: WelcomeScreen,
  BOTTOM_TABS: BottomTabsScreen,
  LOGIN: LoginScreen,
  PROJECT_VIEW: ProjectViewScreen,
  CREATE_PROJECT: CreateProjectScreen,
  SITE_TRANSFER_PROJECT: SiteTransferProjectScreen,
  CREATE_SITE: CreateSiteScreen,
  TEMP_LOCATION: TemporaryLocationScreen,
  SITE_TABS: SiteTabsScreen,
  SITE_LOCATION_SOIL_ID: SiteLocationSoilIdScreen,
  TEMPORARY_LOCATION_SOIL_ID: TemporaryLocationSoilIdScreen,
  TEMP_LOCATION_SOIL_MATCH_INFO: TemporaryLocationSoilMatchInfoScreen,
  SITE_SOIL_MATCH_INFO: SiteSoilMatchInfoScreen,
  SITE_SETTINGS: SiteSettingsScreen,
  SITE_TEAM_SETTINGS: SiteTeamSettingsScreen,
  ADD_USER_PROJECT: AddUserToProjectScreen,
  ADD_USER_PROJECT_ROLE: AddUserToProjectRoleScreen,
  MANAGE_TEAM_MEMBER: ManageTeamMemberScreen,
  SLOPE_STEEPNESS: SlopeSteepnessScreen,
  SLOPE_SHAPE: SlopeShapeScreen,
  SLOPE_METER: SlopeMeterScreen,
  SOIL_SURFACE: SoilSurfaceScreen,
  SOIL_INPUT_soilTexture: TextureScreen,
  SOIL_INPUT_soilColor: ColorScreen,
  SOIL_INPUT_sodiumAdsorptionRatio: SARScreen,
  SOIL_INPUT_soilOrganicCarbonMatter: SOCSOMScreen,
  SOIL_INPUT_soilStructure: StructureScreen,
  SOIL_INPUT_electricalConductivity: ConductivityScreen,
  SOIL_INPUT_carbonates: CarbonatesScreen,
  SOIL_INPUT_ph: PhScreen,
  TEXTURE_GUIDE: TextureGuideScreen,
  COLOR_GUIDE: ColorGuideScreen,
  COLOR_ANALYSIS: ColorAnalysisScreen,
  DATA_EXPORT: UserDataExportScreen,
  PROJECT_EXPORT: ProjectExportScreen,
  SITE_EXPORT: SiteExportScreen,
  DELETE_ACCOUNT: DeleteAccountScreen,
} satisfies ScreenDefinitions;

export const modalScreenDefinitions = {
  ADD_SITE_NOTE: AddSiteNoteScreen,
  EDIT_SITE_NOTE: EditSiteNoteScreen,
  EDIT_PINNED_NOTE: EditPinnedNoteScreen,
  READ_PINNED_NOTE: ReadPinnedNoteScreen,
} satisfies ScreenDefinitions;

export const combinedScreenDefinitions = {
  ...screenDefinitions,
  ...modalScreenDefinitions,
} satisfies ScreenDefinitions;

export const screens = generateScreens(RootStack, screenDefinitions);

export const modalScreens = generateScreens(RootStack, modalScreenDefinitions);
