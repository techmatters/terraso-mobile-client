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

import {useCallback, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {Select} from 'terraso-mobile-client/components/inputs/Select';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByProjectRole} from 'terraso-mobile-client/components/restrictions/RestrictByRole';
import {useProjectRoleContext} from 'terraso-mobile-client/context/ProjectRoleContext';
import {PROJECT_MANAGER_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {
  DEPTH_PRESETS,
  ProjectDepthIntervalPreset,
  updateProjectSoilSettings,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {AddProjectDepthOverlaySheet} from 'terraso-mobile-client/screens/ProjectInputScreen/AddProjectDepthOverlaySheet';
import {DepthTable} from 'terraso-mobile-client/screens/ProjectInputScreen/DepthTable';
import {useDispatch} from 'terraso-mobile-client/store';
import {useProjectSoilSettings} from 'terraso-mobile-client/store/selectors';

export const SoilPitSettings = ({projectId}: {projectId: string}) => {
  const {t} = useTranslation();
  const modalRef = useRef<ModalHandle>(null);
  const settings = useProjectSoilSettings(projectId);
  const [newPreset, setNewPreset] = useState(settings.depthIntervalPreset);
  const dispatch = useDispatch();

  const projectRole = useProjectRoleContext();

  const userCanUpdateDepths = useMemo(
    () => projectRole === 'MANAGER',
    [projectRole],
  );

  const isCustom = settings.depthIntervalPreset === 'CUSTOM';

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
      t(`projects.inputs.depths.preset.${preset}`),
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
            label={t('projects.inputs.depths.title')}
            disabled={!userCanUpdateDepths}
          />
        )}
        title={t('projects.inputs.depths.confirm_preset.title')}
        body={t('projects.inputs.depths.confirm_preset.body')}
        actionLabel={t('projects.inputs.depths.confirm_preset.confirm')}
        handleConfirm={onChangeDepthPreset}
      />
      {settings.depthIntervalPreset !== 'NONE' && (
        <DepthTable
          depthIntervals={settings.depthIntervals}
          projectId={projectId}
          canDeleteDepth={isCustom && userCanUpdateDepths}
          includeLabel={isCustom}
          pb="15px"
        />
      )}
      {isCustom && (
        <RestrictByProjectRole role={PROJECT_MANAGER_ROLES}>
          <AddProjectDepthOverlaySheet
            projectId={projectId}
            existingDepths={settings.depthIntervals}
          />
        </RestrictByProjectRole>
      )}
    </Box>
  );
};
