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

import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {
  Box,
  Column,
  Heading,
  Paragraph,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useTranslation} from 'react-i18next';
import {pitMethodSummary} from 'terraso-mobile-client/screens/SoilScreen/utils/renderValues';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectDepthDependentData} from 'terraso-client-shared/selectors';
import {SwitchWorkflowButton} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/SwitchWorkflowButton';
import {DepthDependentSelect} from 'terraso-mobile-client/screens/SoilScreen/components/DepthDependentSelect';
import {
  colorHues,
  colorValues,
  colorChromas,
  updateDepthDependentSoilData,
  colorHueSubsteps,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {useCallback, useMemo, useState} from 'react';
import {Select} from 'terraso-mobile-client/components/inputs/Select';
import {
  parseMunsellHue,
  renderMunsellHue,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/munsellConversions';

export const ManualWorkflow = (props: SoilPitInputScreenProps) => {
  const {t} = useTranslation();
  const data = useSelector(selectDepthDependentData(props));
  const {complete} = pitMethodSummary(t, data, 'soilColor');

  const {hueSubstep, hue} = useMemo(
    () =>
      data?.colorHue
        ? renderMunsellHue(data.colorHue)
        : {hueSubstep: null, hue: null},
    [data?.colorHue],
  );

  const [selectedSubstep, setSelectedSubstep] = useState(hueSubstep);
  const [selectedHue, setSelectedHue] = useState(hue);

  const dispatch = useDispatch();

  const updateHue = useCallback(
    (
      newSubstep: (typeof colorHueSubsteps)[number],
      newHue: (typeof colorHues)[number],
    ) => {
      dispatch(
        updateDepthDependentSoilData({
          siteId: props.siteId,
          depthInterval: props.depthInterval.depthInterval,
          colorHue: parseMunsellHue({
            hue: newHue,
            hueSubstep: newSubstep,
          }),
          colorPhotoUsed: false,
        }),
      );
    },
    [dispatch, props.siteId, props.depthInterval.depthInterval],
  );

  const onUpdateSubstep = useCallback(
    (substep: (typeof colorHueSubsteps)[number] | null) => {
      setSelectedSubstep(substep);
      if (selectedHue && substep) {
        updateHue(substep, selectedHue);
      }
    },
    [selectedHue, updateHue],
  );

  const onUpdateHue = useCallback(
    (newHue: (typeof colorHues)[number] | null) => {
      setSelectedHue(newHue);
      if (newHue && selectedSubstep) {
        updateHue(selectedSubstep, newHue);
      }
    },
    [selectedSubstep, updateHue],
  );

  return (
    <Column>
      <Column padding="md" space="24px">
        <Row>
          <Select
            nullable
            options={colorHueSubsteps}
            value={selectedSubstep}
            label={t('soil.color.hue')}
            onValueChange={onUpdateSubstep}
            renderValue={value => value.toString()}
            width={150}
          />
          <Box flex={1} />
          <Select
            nullable
            options={colorHues}
            value={selectedHue}
            label={t('soil.color.hue')}
            onValueChange={onUpdateHue}
            renderValue={value => value}
            width={150}
          />
        </Row>
        <Row alignItems="center">
          <DepthDependentSelect
            input="colorValue"
            options={colorValues}
            renderValue={(value: number) => value.toString()}
            label={t('soil.color.value')}
            width={150}
            {...props}
          />
          <Heading variant="h6" textAlign="center" flex={1}>
            /
          </Heading>
          <DepthDependentSelect
            input="colorChroma"
            options={colorChromas}
            renderValue={(chroma: number) => chroma.toString()}
            label={t('soil.color.chroma')}
            width={150}
            {...props}
          />
        </Row>
      </Column>
      {!complete && (
        <Column
          paddingHorizontal="md"
          paddingVertical="lg"
          backgroundColor="grey.300"
          alignItems="flex-start">
          <Paragraph variant="body1">
            {t('soil.color.use_photo_instead')}
          </Paragraph>
          <SwitchWorkflowButton
            {...props}
            rightIcon={<Icon name="chevron-right" />}
          />
        </Column>
      )}
    </Column>
  );
};
