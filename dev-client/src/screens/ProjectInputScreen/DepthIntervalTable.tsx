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
import {Box} from 'native-base';
import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {
  DepthInterval,
  LabelOptional,
  ProjectDepthInterval,
  deleteProjectDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {DataGridTable} from 'terraso-mobile-client/components/DataGridTable';
import {IconButton} from 'terraso-mobile-client/components/Icons';
import {useDispatch} from 'terraso-mobile-client/store';

type TableProps = {
  depthIntervals: LabelOptional<ProjectDepthInterval>[];
  projectId: string;
  includeLabel: boolean;
  canDeleteInterval: boolean;
} & Omit<React.ComponentProps<typeof DataGridTable>, 'rows' | 'headers'>;

export const DepthIntervalTable = ({
  depthIntervals,
  projectId,
  canDeleteInterval,
  includeLabel,
  ...extraProps
}: TableProps) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const headers = [];
  if (includeLabel) {
    headers.push(t('projects.inputs.depth_intervals.label'));
  }
  headers.push(t('projects.inputs.depth_intervals.depth', {units: 'cm'}));
  if (canDeleteInterval) {
    headers.push('');
  }

  const deleteDepthInterval = useCallback(
    (depthInterval: DepthInterval) => () => {
      return dispatch(deleteProjectDepthInterval({projectId, depthInterval}));
    },
    [projectId, dispatch],
  );

  const rows = useMemo(() => {
    return depthIntervals.map(({label, depthInterval}) => {
      let result: (string | React.ReactElement)[] = [];
      if (includeLabel) {
        result.push(label || '');
      }
      result.push(
        t('soil.depth_interval.bounds', {depthInterval, units: 'cm'}),
      );
      if (canDeleteInterval) {
        result.push(
          <Box flex={1} flexDirection="row" justifyContent="flex-end">
            <IconButton
              name="close"
              onPress={deleteDepthInterval(depthInterval)}
              _icon={{
                size: 'sm',
                color: 'action.active',
              }}
            />
          </Box>,
        );
      }
      return result;
    });
  }, [depthIntervals, canDeleteInterval, includeLabel, deleteDepthInterval, t]);

  return <DataGridTable headers={headers} rows={rows} {...extraProps} />;
};
