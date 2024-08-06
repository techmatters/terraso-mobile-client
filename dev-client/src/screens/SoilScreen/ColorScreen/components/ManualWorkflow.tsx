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

import {useCallback, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet} from 'react-native';
import Animated, {LinearTransition} from 'react-native-reanimated';

import {
  selectDepthDependentData,
  selectUserRoleSite,
} from 'terraso-client-shared/selectors';
import {
  ColorChroma,
  ColorHueSubstep,
  ColorValue,
  SoilColorHue,
  soilColorHues,
  updateDepthDependentSoilData,
} from 'terraso-client-shared/soilId/soilIdSlice';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {Select} from 'terraso-mobile-client/components/inputs/Select';
import {
  Box,
  Column,
  Heading,
  Paragraph,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/RestrictByRole';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {
  isColorComplete,
  parseMunsellHue,
  renderMunsellHue,
} from 'terraso-mobile-client/model/color/munsellConversions';
import {
  ColorProperties,
  ColorPropertyUpdate,
  updateColorSelections,
  validProperties,
} from 'terraso-mobile-client/model/color/soilColorValidation';
import {SwitchWorkflowButton} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/SwitchWorkflowButton';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const ManualWorkflow = (props: SoilPitInputScreenProps) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const data = useSelector(selectDepthDependentData(props));

  const userRole = useSelector(state =>
    selectUserRoleSite(state, props.siteId),
  );

  const isViewer = useMemo(
    () => Boolean(userRole && ['VIEWER'].includes(userRole.role)),
    [userRole],
  );

  const {hue: initialHue, substep: initialSubstep} = renderMunsellHue(data);

  const [color, setColor] = useState<ColorProperties>({
    hue: initialHue as SoilColorHue | null,
    substep: initialSubstep,
    value: (data.colorValue ?? null) as ColorValue | null,
    chroma: (data.colorChroma ?? null) as ColorChroma | null,
  });

  const updateColor = useCallback(
    (update: ColorPropertyUpdate) => {
      const newColor = updateColorSelections(color, update);
      setColor(newColor);
      dispatch(
        updateDepthDependentSoilData({
          siteId: props.siteId,
          depthInterval: props.depthInterval.depthInterval,
          colorHue: parseMunsellHue(newColor),
          colorValue: newColor.value,
          colorChroma: newColor.chroma,
          colorPhotoUsed: false,
        }),
      );
    },
    [
      color,
      setColor,
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

  const onUpdateChroma = useCallback(
    (chroma: ColorChroma | null) => updateColor({chroma}),
    [updateColor],
  );

  const validOptions = useMemo(() => validProperties(color), [color]);

  return (
    <SiteRoleContextProvider siteId={props.siteId}>
      <Column>
        <Row padding="md" rowGap={24} flexWrap="wrap" alignItems="center">
          {color.hue !== 'N' && (
            <>
              <Select
                disabled={isViewer}
                nullable
                options={validOptions.substeps}
                value={color.substep}
                label={t('soil.color.hue')}
                onValueChange={onUpdateSubstep}
                renderValue={value => value.toString()}
                {...styles.propertySelect}
              />
              <Box flex={1} />
            </>
          )}
          <Animated.View layout={LinearTransition}>
            <Select
              disabled={isViewer}
              nullable
              options={soilColorHues}
              value={color.hue}
              label={t('soil.color.hue')}
              onValueChange={onUpdateHue}
              renderValue={value => value}
              {...styles.propertySelect}
            />
          </Animated.View>
          {color.hue === 'N' && <Box flex={1} />}
          <Animated.View layout={LinearTransition}>
            <Select
              disabled={isViewer}
              nullable
              value={color.value}
              options={validOptions.values}
              onValueChange={onUpdateValue}
              renderValue={value => value.toString()}
              label={t('soil.color.value')}
              {...styles.propertySelect}
            />
          </Animated.View>
          <Animated.View layout={LinearTransition} style={styles.slash}>
            <Heading variant="h6" textAlign="center">
              /
            </Heading>
          </Animated.View>
          {color.chroma !== 0 && (
            <Select
              disabled={isViewer}
              nullable
              value={color.chroma}
              options={validOptions.chromas}
              onValueChange={onUpdateChroma}
              renderValue={chroma => chroma.toString()}
              label={t('soil.color.chroma')}
              {...styles.propertySelect}
            />
          )}
        </Row>
        <RestrictBySiteRole
          role={[
            {kind: 'project', role: 'MANAGER'},
            {kind: 'project', role: 'CONTRIBUTOR'},
            {kind: 'site', role: 'OWNER'},
          ]}>
          {!isColorComplete(data) && (
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
        </RestrictBySiteRole>
      </Column>
    </SiteRoleContextProvider>
  );
};

const styles = StyleSheet.create({
  slash: {
    flex: 1,
  },
  propertySelect: {
    width: 150,
  },
});
