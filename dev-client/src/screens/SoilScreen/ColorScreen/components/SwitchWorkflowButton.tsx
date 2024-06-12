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
import {useTranslation} from 'react-i18next';

import {Button} from 'native-base';

import {selectDepthDependentData} from 'terraso-client-shared/selectors';
import {updateDepthDependentSoilData} from 'terraso-client-shared/soilId/soilIdSlice';

import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {updatePreferences} from 'terraso-mobile-client/model/preferences/preferencesSlice';
import {isColorComplete} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/soilColorValidation';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const SwitchWorkflowButton = ({
  siteId,
  depthInterval,
  ...props
}: SoilPitInputScreenProps &
  Omit<React.ComponentProps<typeof Button>, 'onPress'>) => {
  const {t} = useTranslation();
  const data = useSelector(selectDepthDependentData({siteId, depthInterval}));
  const preferencesWorkflow = useSelector(
    state => state.preferences.colorWorkflow,
  );
  const siteWorkflow =
    typeof data.colorPhotoUsed !== 'boolean'
      ? undefined
      : data.colorPhotoUsed
        ? 'CAMERA'
        : 'MANUAL';
  const workflow = siteWorkflow ?? preferencesWorkflow;
  const dispatch = useDispatch();
  const switchWorkflow = useCallback(() => {
    const newWorkflow = workflow === 'MANUAL' ? 'CAMERA' : 'MANUAL';
    dispatch(
      updatePreferences({
        colorWorkflow: newWorkflow,
      }),
    );
    dispatch(
      updateDepthDependentSoilData({
        siteId,
        depthInterval: depthInterval.depthInterval,
        ...(isColorComplete(data)
          ? {
              colorHue: null,
              colorValue: null,
              colorChroma: null,
            }
          : {}),
        colorPhotoUsed: newWorkflow === 'CAMERA',
      }),
    );
  }, [dispatch, siteId, depthInterval.depthInterval, workflow, data]);

  const button = (onPress: () => void) => (
    <Button onPress={onPress} {...props}>
      {workflow === 'MANUAL'
        ? t('soil.color.workflow.CAMERA')
        : t('soil.color.workflow.MANUAL')}
    </Button>
  );

  return isColorComplete(data) ? (
    <ConfirmModal
      title={t('soil.color.confirm_delete.title')}
      body={t('soil.color.confirm_delete.body')}
      actionName={t('soil.color.confirm_delete.action_name')}
      handleConfirm={switchWorkflow}
      trigger={button}
    />
  ) : (
    button(switchWorkflow)
  );
};
