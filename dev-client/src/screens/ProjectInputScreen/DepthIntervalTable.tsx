import {Box, IconButton} from 'native-base';
import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {
  DepthInterval,
  ProjectDepthInterval,
  deleteProjectDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {DataGridTable} from 'terraso-mobile-client/components/DataGridTable';
import {useDispatch} from 'terraso-mobile-client/store';

type TableProps = {
  depthIntervals: ProjectDepthInterval[];
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
        result.push(label);
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
  }, [depthIntervals, canDeleteInterval, includeLabel]);

  return <DataGridTable headers={headers} rows={rows} {...extraProps} />;
};
