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
import {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {SoilIdSoilDataDepthIntervalPresetChoices} from 'terraso-client-shared/graphqlSchema/graphql';
import {useModal} from 'terraso-mobile-client/components/Modal';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {
  Column,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {ConfirmModal} from 'terraso-mobile-client/components/ConfirmModal';

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
      <RadioBlock
        label={t('soil.soil_preset.label')}
        labelProps={{variant: 'body1'}}
        options={{
          LANDPKS: {text: t('soil.soil_preset.LANDPKS')},
          NRCS: {text: t('soil.soil_preset.NRCS')},
          CUSTOM: {text: t('soil.soil_preset.CUSTOM')},
        }}
        groupProps={{
          name: 'soil-preset',
          value: selectedPreset,
          onChange: (value: string) =>
            updateSelectedPreset(
              value as SoilIdSoilDataDepthIntervalPresetChoices,
            ),
        }}
      />
      <ConfirmModal
        trigger={onOpen => (
          <Button
            size="lg"
            onPress={() => {
              if (selectedPreset === selected) {
                modalHandle?.onClose();
              } else {
                onOpen();
              }
            }}
            _text={{textTransform: 'uppercase'}}
            alignSelf="flex-end">
            {t('general.save')}
          </Button>
        )}
        handleConfirm={onConfirm}
        title={t('projects.inputs.depth_intervals.confirm_preset.title')}
        body={t('projects.inputs.depth_intervals.confirm_preset.body')}
        actionName={t('projects.inputs.depth_intervals.confirm_preset.confirm')}
      />
    </Column>
  );
};
