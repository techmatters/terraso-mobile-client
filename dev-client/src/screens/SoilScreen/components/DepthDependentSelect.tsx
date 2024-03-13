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

import {DepthDependentSoilData} from 'terraso-client-shared/soilId/soilIdTypes';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {Select} from 'native-base';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectDepthDependentData} from 'terraso-client-shared/selectors';
import {updateDepthDependentSoilData} from 'terraso-client-shared/soilId/soilIdSlice';
import {useCallback} from 'react';

type Props<K extends keyof DepthDependentSoilData> = SoilPitInputScreenProps &
  React.ComponentProps<typeof Select> & {
    input: K;
    values: readonly NonNullable<DepthDependentSoilData[K]>[];
    renderValue: (value: NonNullable<DepthDependentSoilData[K]>) => string;
    label: string;
  };

export const DepthDependentSelect = <K extends keyof DepthDependentSoilData>({
  input,
  values,
  renderValue,
  label,
  siteId,
  depthInterval,
  ...props
}: Props<K>) => {
  const currentValue = useSelector(
    selectDepthDependentData({siteId, depthInterval}),
  )?.[input];
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
    <Select
      placeholder={label}
      selectedValue={currentValue}
      onValueChange={onUpdate}
      {...props}>
      {values.map(value => (
        <Select.Item key={value} value={value} label={renderValue(value)} />
      ))}
    </Select>
  );
};
