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

import {TFunction} from 'i18next';
import * as yup from 'yup';

import {SoilDataUpdateDepthIntervalMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {fromEntries} from 'terraso-client-shared/utils';

import {DepthTextFormInput} from 'terraso-mobile-client/components/form/depthInterval/DepthTextInputs';
import {
  DepthInterval,
  methodEnabled,
  SoilDataDepthInterval,
  SoilPitMethod,
  soilPitMethods,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {depthSchema} from 'terraso-mobile-client/schemas/depthSchema';
import {AggregatedInterval} from 'terraso-mobile-client/store/depthIntervalHelpers';

type EnabledInputMethodsInput = Omit<
  SoilDataDepthInterval,
  'label' | 'depthInterval'
>;
export type SiteDepthFormInput = DepthTextFormInput &
  EnabledInputMethodsInput & {
    applyToAll: boolean;
  };

type DepthOverlaySchemaType = ReturnType<typeof getDepthOverlaySheetSchema>;
export const getDepthOverlaySheetSchema = (
  t: TFunction,
  existingDepths: {depthInterval: DepthInterval}[],
) =>
  depthSchema({t, existingDepths}).shape({
    applyToAll: yup.boolean().required(),
    ...fromEntries(
      soilPitMethods
        .map(methodEnabled)
        .map(method => [method, yup.boolean().required()]),
    ),
  });

export const getInitialValuesForSiteEdit = (
  thisInterval: AggregatedInterval,
) => {
  const thisDepthInterval = thisInterval.interval.depthInterval;
  return {
    start: String(thisDepthInterval.start),
    end: String(thisDepthInterval.end),
    applyToAll: false,
    // Includes label and required methods
    ...thisInterval.interval,
  };
};

export const getInitialValuesForSiteAdd = (requiredInputs: SoilPitMethod[]) => {
  const initiallyEnabledInputs = {} as EnabledInputMethodsInput;
  soilPitMethods.forEach(method => {
    const enabledName = methodEnabled(method);
    initiallyEnabledInputs[enabledName] = requiredInputs.includes(method);
  });
  return {
    label: '',
    start: '',
    end: '',
    applyToAll: false,
    ...initiallyEnabledInputs,
  };
};

export const getUpdateDepthActionInputFromFormInput = (
  values: SiteDepthFormInput,
  schema: DepthOverlaySchemaType,
  siteId: string,
  existingDepths: {depthInterval: DepthInterval}[],
) => {
  const {label, start, end, applyToAll, ...enabledInputs} = schema.cast(values);

  return {
    siteId,
    applyToIntervals: applyToAll
      ? existingDepths.map(depth => depth.depthInterval)
      : undefined,
    label,
    ...enabledInputs,
    depthInterval: {start, end},
  } as SoilDataUpdateDepthIntervalMutationInput;
};
