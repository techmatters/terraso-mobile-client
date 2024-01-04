import {Box, Button, Select, Text} from 'native-base';
import {useCallback, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {SoilIdProjectSoilSettingsDepthIntervalPresetChoices} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  LabelledDepthInterval,
  ProjectSoilSettings,
  updateProjectDepthInterval,
  updateProjectSoilSettings,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {ConfirmModal} from 'terraso-mobile-client/components/ConfirmModal';
import {useProjectRoleContext} from 'terraso-mobile-client/context/ProjectRoleContext';
import {useDispatch} from 'terraso-mobile-client/store';
import {DepthIntervalTable} from './DepthIntervalTable';
import {AddIntervalModal} from 'terraso-mobile-client/components/AddIntervalModal';
import {DepthPresets} from 'terraso-mobile-client/constants';
import {Modal} from 'terraso-mobile-client/components/Modal';
import {Icon} from 'terraso-mobile-client/components/Icons';

export const SoilPitSettings = ({
  data: settings,
  projectId,
}: {
  data: ProjectSoilSettings;
  projectId: string;
}) => {
  const {t} = useTranslation();
  const [selectedPreset, setSelectedPreset] =
    useState<SoilIdProjectSoilSettingsDepthIntervalPresetChoices>(
      settings.depthIntervalPreset,
    );
  const dispatch = useDispatch();
  const existingIntervals = useMemo(
    () => settings.depthIntervals.map(interval => interval.depthInterval),
    [settings.depthIntervals],
  );

  const projectRole = useProjectRoleContext();

  const userCanUpdateIntervals = useMemo(
    () => projectRole === 'manager',
    [projectRole],
  );

  const customizable = useMemo(
    () => settings.depthIntervalPreset === 'CUSTOM',
    [settings],
  );

  const onAddDepthInterval = useCallback(
    async (interval: LabelledDepthInterval) => {
      await dispatch(updateProjectDepthInterval({projectId, ...interval}));
    },
    [projectId, dispatch],
  );

  const onChangeDepthPreset = useCallback(() => {
    dispatch(
      updateProjectSoilSettings({
        projectId,
        depthIntervalPreset: selectedPreset,
      }),
    );
  }, [dispatch, projectId, selectedPreset]);

  const onSelectUpdated = useCallback(
    (onOpen: () => void) => (value: string) => {
      if (value === selectedPreset) {
        return;
      }
      setSelectedPreset(
        value as SoilIdProjectSoilSettingsDepthIntervalPresetChoices,
      );
      onOpen();
    },

    [selectedPreset, setSelectedPreset],
  );

  return (
    <Box p={4}>
      <Text color={'primary.main'}>
        {t('projects.inputs.depth_intervals.title')}
      </Text>
      <ConfirmModal
        trigger={onOpen => (
          <Select
            mb={5}
            width={'60%'}
            variant={'underlined'}
            selectedValue={settings.depthIntervalPreset}
            onValueChange={onSelectUpdated(onOpen)}>
            {DepthPresets.map(preset => (
              <Select.Item
                label={t(
                  `projects.inputs.depth_intervals.${preset.toLowerCase()}`,
                )}
                value={preset}
                key={preset}
              />
            ))}
          </Select>
        )}
        title={t('projects.inputs.depth_intervals.confirm_preset.title')}
        body={t('projects.inputs.depth_intervals.confirm_preset.body')}
        actionName={t('projects.inputs.depth_intervals.confirm_preset.confirm')}
        handleConfirm={onChangeDepthPreset}
      />
      <DepthIntervalTable
        depthIntervals={settings.depthIntervals}
        projectId={projectId}
        canDeleteInterval={customizable && userCanUpdateIntervals}
        includeLabel={customizable}
        pb="15px"
      />
      {customizable ? (
        <Modal
          trigger={onOpen => (
            <Button
              onPress={onOpen}
              alignSelf="flex-start"
              backgroundColor="primary.main"
              shadow={5}
              leftIcon={<Icon name="add" />}>
              {t('soil.add_depth_label')}
            </Button>
          )}>
          <AddIntervalModal
            onSubmit={onAddDepthInterval}
            existingIntervals={existingIntervals}
          />
        </Modal>
      ) : undefined}
    </Box>
  );
};
