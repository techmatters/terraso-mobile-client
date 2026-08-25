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

import {act, fireEvent} from '@testing-library/react-native';
/* The shared render wraps the app providers, and the integration setup calls
 * setAPIConfig — without it, importing soilDataSlice throws at module load. */
import {render} from '@testing/integration/utils';
import {Formik} from 'formik';

import {
  getInitialValuesForSiteEdit,
  SiteDepthFormInput,
} from 'terraso-mobile-client/components/form/depthInterval/depthOverlaySheetHelpers';
import {EnabledInputToggles} from 'terraso-mobile-client/components/form/depthInterval/EnabledInputToggles';
import {
  SoilDataDepthInterval,
  SoilPitMethod,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {AggregatedInterval} from 'terraso-mobile-client/store/depthIntervalHelpers';

/* Covers the seam the unit tests can't: the toggles are seeded by the real
 * getInitialValuesForSiteEdit, the same way EditDepthOverlaySheet does it. The
 * bug this guards against is a required method displaying as on while the form
 * underneath still holds false, which then submits as false. */

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

/* Selected by Formik field name rather than by label, since the labels are
 * translated strings that a POEditor sync can change. */
const switchFor = (method: SoilPitMethod) => `${method}Enabled-switch`;

const renderToggles = (
  interval: AggregatedInterval,
  requiredInputs: SoilPitMethod[],
) => {
  let latestValues = {} as SiteDepthFormInput;
  const utils = render(
    <Formik
      initialValues={getInitialValuesForSiteEdit(interval, requiredInputs)}
      onSubmit={() => {}}>
      {formik => {
        latestValues = formik.values as SiteDepthFormInput;
        return <EnabledInputToggles requiredInputs={requiredInputs} />;
      }}
    </Formik>,
  );

  return {...utils, values: () => latestValues};
};

describe('EnabledInputToggles', () => {
  test('shows a stored-off method as off when the project does not require it', () => {
    const {getByTestId} = renderToggles(
      intervalWith({soilColorEnabled: false}),
      [],
    );

    expect(getByTestId(switchFor('soilColor')).props.value).toBe(false);
  });

  test('shows a required method as on and locked, even when it was stored as off', () => {
    const {getByTestId} = renderToggles(
      intervalWith({soilColorEnabled: false}),
      ['soilColor'],
    );

    const element = getByTestId(switchFor('soilColor'));
    expect(element.props.value).toBe(true);
    expect(element.props.disabled).toBe(true);
  });

  test('leaves methods the project does not require editable', async () => {
    const {getByTestId, values} = renderToggles(
      intervalWith({soilColorEnabled: false, soilTextureEnabled: false}),
      ['soilColor'],
    );

    await act(async () => {
      fireEvent(getByTestId(switchFor('soilTexture')), 'valueChange', true);
    });

    expect(values().soilTextureEnabled).toBe(true);
    // The required method is untouched by its neighbor.
    expect(values().soilColorEnabled).toBe(true);
  });

  test('writes an unrequired method back off again', async () => {
    const {getByTestId, values} = renderToggles(
      intervalWith({soilTextureEnabled: true}),
      [],
    );

    await act(async () => {
      fireEvent(getByTestId(switchFor('soilTexture')), 'valueChange', false);
    });

    expect(values().soilTextureEnabled).toBe(false);
  });
});
