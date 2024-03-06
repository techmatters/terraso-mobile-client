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

import {Button, Select} from 'native-base';
import {useCallback, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {SoilIdProjectSoilSettingsDepthIntervalPresetChoices} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  LabelledDepthInterval,
  updateProjectDepthInterval,
  updateProjectSoilSettings,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {ConfirmModal} from 'terraso-mobile-client/components/ConfirmModal';
import {useProjectRoleContext} from 'terraso-mobile-client/context/ProjectRoleContext';
import {useDispatch} from 'terraso-mobile-client/store';
import {DepthIntervalTable} from 'terraso-mobile-client/screens/ProjectInputScreen/DepthIntervalTable';
import {AddIntervalModal} from 'terraso-mobile-client/components/AddIntervalModal';
import {DepthPresets} from 'terraso-mobile-client/constants';
import {Modal} from 'terraso-mobile-client/components/Modal';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {Box, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useProjectSoilSettings} from 'terraso-client-shared/selectors';

export const SoilPitSettings = ({projectId}: {projectId: string}) => {
  const {t} = useTranslation();
  const settings = useProjectSoilSettings(projectId);
  const [selectedPreset, setSelectedPreset] =
    useState<SoilIdProjectSoilSettingsDepthIntervalPresetChoices>(
      settings.depthIntervalPreset,
    );
  const dispatch = useDispatch();

  const projectRole = useProjectRoleContext();

  const userCanUpdateIntervals = useMemo(
    () => projectRole === 'manager',
    [projectRole],
  );

  const isCustom = settings.depthIntervalPreset === 'CUSTOM';

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
            onValueChange={onSelectUpdated(onOpen)}
            isDisabled={!userCanUpdateIntervals}>
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
      {settings.depthIntervalPreset !== 'NONE' && (
        <DepthIntervalTable
          depthIntervals={settings.depthIntervals}
          projectId={projectId}
          canDeleteInterval={isCustom && userCanUpdateIntervals}
          includeLabel={isCustom}
          pb="15px"
        />
      )}
      {isCustom && (
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
            existingIntervals={settings.depthIntervals}
          />
        </Modal>
      )}
    </Box>
  );
};
