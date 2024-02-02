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

import {Button, Column, Heading, Text} from 'native-base';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {SoilIdSoilDataDepthIntervalPresetChoices} from 'terraso-client-shared/graphqlSchema/graphql';
import {useModal} from 'terraso-mobile-client/components/Modal';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';

type Props = {
  selected: SoilIdSoilDataDepthIntervalPresetChoices;
  updateChoice: (newChoice: SoilIdSoilDataDepthIntervalPresetChoices) => void;
};

export const EditSiteSoilDepthPreset = ({selected, updateChoice}: Props) => {
  const {t} = useTranslation();
  const modalHandle = useModal();
  const onClose = modalHandle ? modalHandle.onClose : () => {};
  const [selectedPreset, updateSelectedPreset] = useState(selected);
  return (
    <Column space="1px" px="18px" pt="18px" pb="23px">
      <Heading variant="h6">{t('soil.soil_preset.header')}</Heading>
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
      <Button
        size="lg"
        onPress={() => {
          updateChoice(selectedPreset);
          onClose();
        }}
        _text={{textTransform: 'uppercase'}}
        alignSelf="flex-end">
        {t('general.save')}
      </Button>
    </Column>
  );
};
