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
  updateDepthDependentSoilData,
  SoilColorHue,
  ColorHueSubstep,
  soilColorHues,
  ColorValue,
  ColorChroma,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {useCallback, useMemo, useState} from 'react';
import {Select} from 'terraso-mobile-client/components/inputs/Select';
import {
  parseMunsellHue,
  renderMunsellHue,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/munsellConversions';
import Animated, {LinearTransition} from 'react-native-reanimated';
import {StyleSheet} from 'react-native';
import {
  isValidChromaFor,
  isValidSubstepFor,
  isValidValueFor,
  validComponents,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/soilColors';

export const ManualWorkflow = (props: SoilPitInputScreenProps) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const data = useSelector(selectDepthDependentData(props));
  const {complete} = pitMethodSummary(t, data, 'soilColor');

  const {substep: initialSubstep, hue: initialHue} = useMemo(
    () =>
      typeof data?.colorHue === 'number'
        ? renderMunsellHue({
            colorHue: data?.colorHue,
            colorChroma: data?.colorChroma,
          })
        : {substep: null, hue: null},
    [data],
  );

  const [selectedSubstep, setSelectedSubstep] = useState(
    initialSubstep ?? null,
  );
  const [selectedHue, setSelectedHue] = useState(
    (initialHue ?? null) as SoilColorHue | null,
  );
  const [selectedValue, setSelectedValue] = useState(
    (data?.colorValue ?? null) as ColorValue | null,
  );

  const updateColor = useCallback(
    (
      color:
        | {hue: SoilColorHue | null}
        | {substep: ColorHueSubstep | null}
        | {value: ColorValue | null},
    ) => {
      let hue = selectedHue;
      let substep = selectedSubstep;
      let value = selectedValue;
      let chroma = (data?.colorChroma ?? null) as ColorChroma | 0 | null;
      if ('value' in color) {
        value = color.value;
      } else {
        if ('hue' in color) {
          hue = color.hue;
          if (!isValidSubstepFor({hue: color.hue, substep: selectedSubstep})) {
            substep = null;
          }
          if (hue === 'N') {
            chroma = 0;
          }
        }
        if ('substep' in color) {
          substep = color.substep;
        }
        if (!isValidValueFor({hue, substep, value})) {
          value = null;
        }
      }

      if (chroma === 0 && hue !== 'N') {
        chroma = null;
      } else if (
        chroma !== 0 &&
        !isValidChromaFor({hue, substep, value, chroma})
      ) {
        chroma = null;
      }

      setSelectedSubstep(substep);
      setSelectedHue(hue);
      setSelectedValue(value);
      dispatch(
        updateDepthDependentSoilData({
          siteId: props.siteId,
          depthInterval: props.depthInterval.depthInterval,
          colorHue:
            hue === 'N'
              ? 0
              : hue && substep
                ? parseMunsellHue({hue, substep})
                : null,
          colorValue: value,
          colorChroma: chroma,
          colorPhotoUsed: false,
        }),
      );
    },
    [
      selectedHue,
      selectedSubstep,
      selectedValue,
      data?.colorChroma,
      dispatch,
      props.siteId,
      props.depthInterval.depthInterval,
    ],
  );

  const onUpdateSubstep = useCallback(
    (substep: ColorHueSubstep | null) => updateColor({substep}),
    [updateColor],
  );

  const onUpdateHue = useCallback(
    (hue: SoilColorHue | null) => updateColor({hue}),
    [updateColor],
  );

  const onUpdateValue = useCallback(
    (value: ColorValue | null) => updateColor({value}),
    [updateColor],
  );

  const validOptions = useMemo(
    () =>
      validComponents({
        hue: selectedHue,
        substep: selectedSubstep,
        value: selectedValue,
      }),
    [selectedHue, selectedSubstep, selectedValue],
  );

  return (
    <Column>
      <Row padding="md" rowGap={24} flexWrap="wrap" alignItems="center">
        {selectedHue !== 'N' && (
          <>
            <Select
              nullable
              options={validOptions.substeps}
              value={selectedSubstep}
              label={t('soil.color.hue')}
              onValueChange={onUpdateSubstep}
              renderValue={value => value.toString()}
              width={150}
            />
            <Box flex={1} />
          </>
        )}
        <Animated.View layout={LinearTransition}>
          <Select
            nullable
            options={soilColorHues}
            value={selectedHue}
            label={t('soil.color.hue')}
            onValueChange={onUpdateHue}
            renderValue={value => value}
            width={150}
          />
        </Animated.View>
        {selectedHue === 'N' && <Box flex={1} />}
        <Animated.View layout={LinearTransition}>
          <Select
            nullable
            value={selectedValue}
            options={validOptions.values}
            onValueChange={onUpdateValue}
            renderValue={value => value.toString()}
            label={t('soil.color.value')}
            width={150}
          />
        </Animated.View>
        <Animated.View layout={LinearTransition} style={styles.slash}>
          <Heading variant="h6" textAlign="center">
            /
          </Heading>
        </Animated.View>
        {selectedHue !== 'N' && (
          <DepthDependentSelect
            input="colorChroma"
            options={validOptions.chromas}
            renderValue={(chroma: number) => chroma.toString()}
            label={t('soil.color.chroma')}
            width={150}
            {...props}
          />
        )}
      </Row>
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

const styles = StyleSheet.create({
  slash: {
    flex: 1,
  },
});
