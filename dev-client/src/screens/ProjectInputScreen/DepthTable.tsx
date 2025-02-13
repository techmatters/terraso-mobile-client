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

import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {IconButton} from 'terraso-mobile-client/components/buttons/icons/IconButton';
import {ConfirmDeleteDepthModal} from 'terraso-mobile-client/components/modals/ConfirmDeleteDepthModal';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {DataGridTable} from 'terraso-mobile-client/components/tables/DataGridTable';
import {
  deleteProjectDepthInterval,
  DepthInterval,
  ProjectDepthInterval,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {useDispatch} from 'terraso-mobile-client/store';

type TableProps = {
  depthIntervals: ProjectDepthInterval[];
  projectId: string;
  includeLabel: boolean;
  canDeleteDepth: boolean;
} & Omit<React.ComponentProps<typeof DataGridTable>, 'rows' | 'headers'>;

export const DepthTable = ({
  depthIntervals,
  projectId,
  canDeleteDepth,
  includeLabel,
  ...extraProps
}: TableProps) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const headers = [];
  if (includeLabel) {
    headers.push(t('projects.inputs.depths.label'));
  }
  headers.push(t('projects.inputs.depths.depth', {units: 'cm'}));
  if (canDeleteDepth) {
    headers.push('');
  }

  const deleteDepth = useCallback(
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
      result.push(t('soil.depth.bounds_unitless', depthInterval));
      if (canDeleteDepth) {
        result.push(
          <Box flex={1} flexDirection="row" justifyContent="flex-end">
            <ConfirmDeleteDepthModal
              onConfirm={deleteDepth(depthInterval)}
              trigger={onOpen => (
                <IconButton type="sm" name="close" onPress={onOpen} />
              )}
            />
          </Box>,
        );
      }
      return result;
    });
  }, [depthIntervals, canDeleteDepth, includeLabel, deleteDepth, t]);

  return <DataGridTable headers={headers} rows={rows} {...extraProps} />;
};
