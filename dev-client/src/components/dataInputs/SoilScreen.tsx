import {Box, Button, Column, Heading, Row} from 'native-base';
import {useDispatch, useSelector} from '../../model/store';
import {useTranslation} from 'react-i18next';
import {Icon, IconButton} from '../common/Icons';
import {AddIntervalModal} from './AddIntervalModal';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {BottomSheetModal, Modal} from '../common/Modal';
import {EditIntervalModal} from './EditIntervalModal';
import {useMemo, useCallback} from 'react';
import {
  LabelledDepthInterval,
  SoilData,
  updateSoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';

export const SoilScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const soilData = useSelector(state => state.soilId.soilData[siteId]) as
    | SoilData
    | undefined;
  const project = useSelector(state => {
    const projectId = state.site.sites[siteId].projectId;
    return projectId ? state.soilId.projectSettings[projectId] : undefined;
  });
  const allIntervals = useMemo(
    () =>
      (project?.depthIntervals ?? [])
        .concat(
          soilData?.depthIntervals?.filter(
            ({depthInterval: a}) =>
              project?.depthIntervals?.every(
                ({depthInterval: b}) => a.end <= b.start || a.start >= b.end,
              ),
          ) ?? [],
        )
        .sort((a, b) => a.depthInterval.start - b.depthInterval.start),
    [project?.depthIntervals, soilData?.depthIntervals],
  );
  const existingIntervals = useMemo(
    () => allIntervals.map(interval => interval.depthInterval),
    [allIntervals],
  );
  const dispatch = useDispatch();

  const onAddDepthInterval = useCallback(
    async (interval: LabelledDepthInterval) => {
      await dispatch(updateSoilDataDepthInterval({siteId, ...interval}));
    },
    [siteId, dispatch],
  );

  return (
    <BottomSheetModalProvider>
      <Column backgroundColor="grey.300">
        <Row backgroundColor="background.default" px="16px" py="12px">
          <Heading variant="h6">{t('soil.surface')}</Heading>
        </Row>
        <Box height="16px" />
        <Row backgroundColor="background.default" px="16px" py="12px">
          <Heading variant="h6">{t('soil.pit')}</Heading>
        </Row>
        {allIntervals.map(interval => (
          <DepthIntervalEditor
            key={`${interval.depthInterval.start}:${interval.depthInterval.end}`}
            siteId={siteId}
            interval={interval}
          />
        ))}
        <Modal
          trigger={onOpen => (
            <Button
              size="lg"
              variant="fullWidth"
              backgroundColor="primary.dark"
              justifyContent="start"
              _text={{
                color: 'primary.contrast',
              }}
              _icon={{
                color: 'primary.contrast',
              }}
              width="full"
              borderRadius="0px"
              leftIcon={<Icon name="add" />}
              onPress={onOpen}>
              {t('soil.add_depth_label')}
            </Button>
          )}>
          <AddIntervalModal
            onSubmit={onAddDepthInterval}
            existingIntervals={existingIntervals}
          />
        </Modal>
      </Column>
    </BottomSheetModalProvider>
  );
};

const DepthIntervalEditor = ({
  siteId,
  interval: {label, depthInterval},
}: {
  siteId: string;
  interval: LabelledDepthInterval;
}) => {
  return (
    <Row
      backgroundColor="primary.dark"
      justifyContent="space-between"
      px="12px"
      py="8px">
      <Heading variant="h6" color="primary.contrast">
        {label && `${label}: `}
        {`${depthInterval.start}-${depthInterval.end} cm`}
      </Heading>
      <BottomSheetModal
        trigger={onOpen => (
          <IconButton
            name="more-vert"
            _icon={{color: 'primary.contrast'}}
            onPress={onOpen}
          />
        )}>
        <EditIntervalModal siteId={siteId} depthInterval={depthInterval} />
      </BottomSheetModal>
    </Row>
  );
};
