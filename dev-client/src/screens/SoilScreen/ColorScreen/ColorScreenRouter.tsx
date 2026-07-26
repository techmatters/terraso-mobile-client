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

import {ColorScreen} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/ColorScreen';
import {useIsExperimentalColorScreenEnabled} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/experimentalColorScreenToggle';
import {ColorScreenExperimental} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/ColorScreenExperimental';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';

// Routes SOIL_INPUT_soilColor to either the production ColorScreen or the
// dev-only ColorScreenExperimental copy, based on a MMKV-persisted flag
// set from Settings (under the FF_testing gate). Kept as a thin dispatch
// so both screens receive the same route props unchanged.
export const ColorScreenRouter = (props: SoilPitInputScreenProps) => {
  const isExperimental = useIsExperimentalColorScreenEnabled();
  return isExperimental ? (
    <ColorScreenExperimental {...props} />
  ) : (
    <ColorScreen {...props} />
  );
};
