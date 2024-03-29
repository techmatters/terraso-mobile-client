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

import {Button} from 'native-base';
import {useCallback, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  DEPTH_PRESETS,
  LabelledDepthInterval,
  ProjectDepthIntervalPreset,
  updateProjectDepthInterval,
  updateProjectSoilSettings,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {ConfirmModal} from 'terraso-mobile-client/components/ConfirmModal';
import {useProjectRoleContext} from 'terraso-mobile-client/context/ProjectRoleContext';
import {useDispatch} from 'terraso-mobile-client/store';
import {DepthIntervalTable} from 'terraso-mobile-client/screens/ProjectInputScreen/DepthIntervalTable';
import {AddIntervalModalBody} from 'terraso-mobile-client/components/AddIntervalModal';
import {Modal, ModalHandle} from 'terraso-mobile-client/components/Modal';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {
  Box,
  Heading,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useProjectSoilSettings} from 'terraso-client-shared/selectors';
import {Select} from 'terraso-mobile-client/components/inputs/Select';

export const SoilPitSettings = ({projectId}: {projectId: string}) => {
  const {t} = useTranslation();
  const modalRef = useRef<ModalHandle>(null);
  const settings = useProjectSoilSettings(projectId);
  const [newPreset, setNewPreset] = useState(settings.depthIntervalPreset);
  const dispatch = useDispatch();

  const projectRole = useProjectRoleContext();

  const userCanUpdateIntervals = useMemo(
    () => projectRole === 'MANAGER',
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
        depthIntervalPreset: newPreset,
      }),
    );
  }, [dispatch, projectId, newPreset]);

  const onSelectUpdated = useCallback(
    (value: ProjectDepthIntervalPreset) => {
      if (value === settings.depthIntervalPreset) {
        return;
      }
      setNewPreset(value);
      modalRef.current?.onOpen();
    },
    [setNewPreset, settings.depthIntervalPreset],
  );

  const renderPreset = useCallback(
    (preset: ProjectDepthIntervalPreset) =>
      t(`projects.inputs.depth_intervals.preset.${preset}`),
    [t],
  );

  return (
    <Box p={4}>
      <ConfirmModal
        ref={modalRef}
        trigger={_ => (
          <Select
            nullable={false}
            options={DEPTH_PRESETS}
            value={settings.depthIntervalPreset}
            onValueChange={onSelectUpdated}
            renderValue={renderPreset}
            label={t('projects.inputs.depth_intervals.title')}
            disabled={!userCanUpdateIntervals}
          />
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
          )}
          Header={
            <Heading variant="h6">{t('soil.depth_interval.add_title')}</Heading>
          }>
          <AddIntervalModalBody
            onSubmit={onAddDepthInterval}
            existingIntervals={settings.depthIntervals}
          />
        </Modal>
      )}
    </Box>
  );
};
