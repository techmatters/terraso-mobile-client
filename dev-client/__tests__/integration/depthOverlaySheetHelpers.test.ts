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
import {
  getInitialValuesForSiteAdd,
  getInitialValuesForSiteEdit,
} from 'terraso-mobile-client/components/form/depthInterval/depthOverlaySheetHelpers';
import {
  SoilDataDepthInterval,
  SoilPitMethod,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {AggregatedInterval} from 'terraso-mobile-client/store/depthIntervalHelpers';

// This is causing errors, and we should not need to use any async thunks in this test, so can just mock it
jest.mock('terraso-client-shared/store/utils', () => ({
  createAsyncThunk: jest.fn(),
}));

describe('getInitialValuesForSiteAdd', () => {
  test('should enable methods for new depth intervals on unaffiliated sites', () => {
    const siteInProject = false;
    const requiredInputs = [] as SoilPitMethod[];

    const initialValues = getInitialValuesForSiteAdd(
      requiredInputs,
      siteInProject,
    );
    expect(initialValues.start).toEqual('');
    expect(initialValues.end).toEqual('');
    expect(initialValues.label).toEqual('');

    expect(initialValues.soilColorEnabled).toEqual(true);
    expect(initialValues.soilTextureEnabled).toEqual(true);

    // Some observation methods are not yet implemented
    expect(initialValues.carbonatesEnabled).toEqual(undefined);
  });

  test('should enable methods for new depth intervals on sites in projects with a required input', () => {
    const siteInProject = true;
    const requiredInputs = ['soilTexture'] as SoilPitMethod[];

    const initialValues = getInitialValuesForSiteAdd(
      requiredInputs,
      siteInProject,
    );
    expect(initialValues.start).toEqual('');
    expect(initialValues.end).toEqual('');
    expect(initialValues.label).toEqual('');

    expect(initialValues.soilColorEnabled).toEqual(false);
    expect(initialValues.soilTextureEnabled).toEqual(true);
  });

  test('should enable methods for new depth intervals on sites in projects with multiple required inputs', () => {
    const siteInProject = true;
    const requiredInputs = ['soilTexture', 'soilColor'] as SoilPitMethod[];

    const initialValues = getInitialValuesForSiteAdd(
      requiredInputs,
      siteInProject,
    );

    expect(initialValues.soilColorEnabled).toEqual(true);
    expect(initialValues.soilTextureEnabled).toEqual(true);
  });

  test('should not enable methods for new depth intervals on sites in projects when inputs are not required', () => {
    const siteInProject = true;
    const requiredInputs = [] as SoilPitMethod[];

    const initialValues = getInitialValuesForSiteAdd(
      requiredInputs,
      siteInProject,
    );

    expect(initialValues.soilColorEnabled).toEqual(false);
    expect(initialValues.soilTextureEnabled).toEqual(false);
  });
});

describe('getInitialValuesForSiteEdit', () => {
  const intervalWith = (
    enabledInputs: Partial<SoilDataDepthInterval>,
  ): AggregatedInterval => ({
    isFromPreset: false,
    interval: {
      label: '',
      depthInterval: {start: 0, end: 10},
      ...enabledInputs,
    } as SoilDataDepthInterval,
  });

  test('should keep stored values for methods the project does not require', () => {
    const initialValues = getInitialValuesForSiteEdit(
      intervalWith({soilColorEnabled: false, soilTextureEnabled: true}),
      [],
    );

    expect(initialValues.start).toEqual('0');
    expect(initialValues.end).toEqual('10');
    expect(initialValues.soilColorEnabled).toEqual(false);
    expect(initialValues.soilTextureEnabled).toEqual(true);
  });

  // A project can require a method after a depth was saved with it off; the sheet shows required methods as on, so the form has to submit them as on too.
  test('should enable required methods that were stored as disabled', () => {
    const initialValues = getInitialValuesForSiteEdit(
      intervalWith({soilColorEnabled: false, soilTextureEnabled: false}),
      ['soilColor'] as SoilPitMethod[],
    );

    expect(initialValues.soilColorEnabled).toEqual(true);
    expect(initialValues.soilTextureEnabled).toEqual(false);
  });
});
