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

import {LoginScreen} from 'terraso-mobile-client/screens/LoginScreen';
import {ProjectListScreen} from 'terraso-mobile-client/screens/ProjectListScreen/ProjectListScreen';
import {ProjectViewScreen} from 'terraso-mobile-client/screens/ProjectViewScreen';
import {CreateProjectScreen} from 'terraso-mobile-client/screens/CreateProjectScreen/CreateProjectScreen';
import {HomeScreen} from 'terraso-mobile-client/screens/HomeScreen/HomeScreen';
import {SiteTransferProjectScreen} from 'terraso-mobile-client/screens/SiteTransferProjectScreen/SiteTransferProjectScreen';
import {CreateSiteScreen} from 'terraso-mobile-client/screens/CreateSiteScreen/CreateSiteScreen';
import {AddSiteNoteScreen} from 'terraso-mobile-client/screens/AddSiteNoteScreen';
import {EditSiteNoteScreen} from 'terraso-mobile-client/screens/EditSiteNoteScreen';
import {ReadNoteScreen} from 'terraso-mobile-client/screens/ReadNoteScreen';
import {EditProjectInstructionsScreen} from 'terraso-mobile-client/screens/EditProjectInstructionsScreen';
import {LocationDashboardScreen} from 'terraso-mobile-client/screens/LocationDashboardScreen';
import {SiteSettingsScreen} from 'terraso-mobile-client/screens/SiteSettingsScreen/SiteSettingsScreen';
import {SiteTeamSettingsScreen} from 'terraso-mobile-client/screens/SiteTeamSettingsScreen';
import {AddUserToProjectScreen} from 'terraso-mobile-client/screens/AddUserToProjectScreen/AddUserToProjectScreen';
import {ManageTeamMemberScreen} from 'terraso-mobile-client/screens/ManageTeamMemberScreen';
import {
  RootStack,
  ScreenDefinitions,
} from 'terraso-mobile-client/navigation/types';
import {SlopeShapeScreen} from 'terraso-mobile-client/screens/SlopeScreen/SlopeShapeScreen';
import {SlopeSteepnessScreen} from 'terraso-mobile-client/screens/SlopeScreen/SlopeSteepnessScreen';
import {SlopeMeterScreen} from 'terraso-mobile-client/screens/SlopeScreen/SlopeMeterScreen';
import {SoilSurfaceScreen} from 'terraso-mobile-client/screens/SoilScreen/components/SoilSurfaceScreen';
import {TextureScreen} from 'terraso-mobile-client/screens/SoilScreen/TextureScreen';
import {ColorScreen} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/ColorScreen';
import {SARScreen} from 'terraso-mobile-client/screens/SoilScreen/SARScreen';
import {SOCSOMScreen} from 'terraso-mobile-client/screens/SoilScreen/SOCSOMScreen';
import {StructureScreen} from 'terraso-mobile-client/screens/SoilScreen/StructureScreen';
import {ConductivityScreen} from 'terraso-mobile-client/screens/SoilScreen/ConductivityScreen';
import {CarbonatesScreen} from 'terraso-mobile-client/screens/SoilScreen/CarbonatesScreen';
import {PhScreen} from 'terraso-mobile-client/screens/SoilScreen/PhScreen';
import {TextureGuideScreen} from 'terraso-mobile-client/screens/SoilScreen/TextureGuideScreen';
import {BottomTabsScreen} from 'terraso-mobile-client/screens/BottomTabsScreen';
import {ColorGuideScreen} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/ColorGuideScreen';
import {ColorAnalysisScreen} from 'terraso-mobile-client/screens/ColorAnalysisScreen/ColorAnalysisScreen';
import {generateScreens} from 'terraso-mobile-client/navigation/utils/utils';

export const bottomTabScreensDefinitions = {
  PROJECT_LIST: ProjectListScreen,
  HOME: HomeScreen,
} satisfies ScreenDefinitions;

export const screenDefinitions = {
  BOTTOM_TABS: BottomTabsScreen,
  LOGIN: LoginScreen,
  PROJECT_VIEW: ProjectViewScreen,
  CREATE_PROJECT: CreateProjectScreen,
  SITE_TRANSFER_PROJECT: SiteTransferProjectScreen,
  CREATE_SITE: CreateSiteScreen,
  LOCATION_DASHBOARD: LocationDashboardScreen,
  SITE_SETTINGS: SiteSettingsScreen,
  SITE_TEAM_SETTINGS: SiteTeamSettingsScreen,
  ADD_USER_PROJECT: AddUserToProjectScreen,
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
} satisfies ScreenDefinitions;

export const modalScreenDefinitions = {
  ADD_SITE_NOTE: AddSiteNoteScreen,
  EDIT_SITE_NOTE: EditSiteNoteScreen,
  EDIT_PROJECT_INSTRUCTIONS: EditProjectInstructionsScreen,
  READ_NOTE: ReadNoteScreen,
} satisfies ScreenDefinitions;

export const combinedScreenDefinitions = {
  ...screenDefinitions,
  ...modalScreenDefinitions,
} satisfies ScreenDefinitions;

export const screens = generateScreens(RootStack, screenDefinitions);

export const modalScreens = generateScreens(RootStack, modalScreenDefinitions);
