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

import {useCallback} from 'react';

import {selectDepthDependentData} from 'terraso-client-shared/selectors';
import {updateDepthDependentSoilData} from 'terraso-client-shared/soilId/soilIdSlice';
import {DepthDependentSoilData} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  Select,
  SelectProps,
} from 'terraso-mobile-client/components/inputs/Select';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

type Props<K extends keyof DepthDependentSoilData> = SoilPitInputScreenProps &
  Omit<
    SelectProps<NonNullable<DepthDependentSoilData[K]>, true>,
    'value' | 'onValueChange' | 'nullable'
  > & {
    input: K;
  };

export const DepthDependentSelect = <K extends keyof DepthDependentSoilData>({
  input,
  siteId,
  depthInterval,
  ...props
}: Props<K>) => {
  const currentValue =
    useSelector(selectDepthDependentData({siteId, depthInterval}))?.[input] ??
    null;
  const dispatch = useDispatch();
  const onUpdate = useCallback(
    (value: DepthDependentSoilData[K]) =>
      dispatch(
        updateDepthDependentSoilData({
          siteId: siteId,
          depthInterval: depthInterval.depthInterval,
          [input]: value,
        }),
      ),
    [input, siteId, depthInterval, dispatch],
  );

  return (
    <Select nullable value={currentValue} onValueChange={onUpdate} {...props} />
  );
};
