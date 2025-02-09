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

import {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {SoilIdSoilDataDepthIntervalPresetChoices} from 'terraso-client-shared/graphqlSchema/graphql';

import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {useModal} from 'terraso-mobile-client/components/modals/Modal';
import {
  Column,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';

type Props = {
  selected: SoilIdSoilDataDepthIntervalPresetChoices;
  updateChoice: (newChoice: SoilIdSoilDataDepthIntervalPresetChoices) => void;
};

export const EditSiteSoilDepthPreset = ({selected, updateChoice}: Props) => {
  const {t} = useTranslation();
  const modalHandle = useModal();
  const [selectedPreset, updateSelectedPreset] = useState(selected);
  const onConfirm = useCallback(() => {
    updateChoice(selectedPreset);
    modalHandle?.onClose();
  }, [modalHandle, updateChoice, selectedPreset]);
  return (
    <Column space="1px" pb="23px">
      <Text variant="body1">{t('soil.soil_preset.info')}</Text>
      <ConfirmModal
        trigger={onOpen => (
          <RadioBlock
            labelProps={{variant: 'body1'}}
            options={{
              NRCS: {text: t('soil.soil_preset.NRCS')},
              BLM: {text: t('soil.soil_preset.BLM')},
              CUSTOM: {text: t('soil.soil_preset.CUSTOM')},
            }}
            groupProps={{
              name: 'soil-preset',
              value: selectedPreset,
              onChange: (value: string) => {
                updateSelectedPreset(
                  value as SoilIdSoilDataDepthIntervalPresetChoices,
                );
                onOpen();
              },
            }}
          />
        )}
        handleConfirm={onConfirm}
        title={t('projects.inputs.depths.confirm_preset.title')}
        body={t('projects.inputs.depths.confirm_preset.body')}
        actionLabel={t('projects.inputs.depths.confirm_preset.confirm')}
      />
    </Column>
  );
};
