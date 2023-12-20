/*
 * Copyright © 2023 Technology Matters
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

import {TFunction} from 'i18next';
import {Box, Column, Heading, Row, Text} from 'native-base';
import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {Pressable} from 'react-native';
import {FormTooltip} from 'terraso-mobile-client/components/form/FormTooltip';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {useSelector} from 'terraso-mobile-client/store';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {SoilData} from 'terraso-client-shared/soilId/soilIdSlice';

type DataSummaryCardProps = {
  required: boolean;
  complete: boolean;
  label: string;
  value?: string;
  onPress: () => void;
};
const DataSummaryCard = ({
  required,
  complete,
  label,
  value,
  onPress,
}: DataSummaryCardProps) => (
  <Pressable onPress={onPress}>
    <Row
      backgroundColor={complete ? 'primary.lightest' : 'primary.contrast'}
      p="15px">
      <Box width="37px">
        {(complete || required) && (
          <Icon
            color={complete ? 'primary.dark' : undefined}
            name={
              complete && required
                ? 'check-circle'
                : complete
                  ? 'check'
                  : 'radio-button-unchecked'
            }
          />
        )}
      </Box>
      <Text variant="body1" fontWeight={700}>
        {label}
      </Text>
      <Box flex={1} />
      <Text variant="body1">{value}</Text>
    </Row>
  </Pressable>
);

export const renderSlopeValue = (
  t: TFunction,
  {slopeSteepnessDegree, slopeSteepnessPercent, slopeSteepnessSelect}: SoilData,
) =>
  slopeSteepnessSelect
    ? t(`slope.steepness.select_labels.${slopeSteepnessSelect}`)
    : typeof slopeSteepnessPercent === 'number'
      ? `${slopeSteepnessPercent.toFixed(0)}%`
      : typeof slopeSteepnessDegree === 'number'
        ? `${slopeSteepnessDegree}°`
        : undefined;

export const SlopeScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const soilData = useSelector(state => state.soilId.soilData[siteId]);
  const required = useSelector(state => {
    const projectId = state.site.sites[siteId].projectId;
    if (projectId === undefined) {
      return false;
    }
    return state.soilId.projectSettings[projectId].slopeRequired;
  });
  const navigation = useNavigation();

  const steepnessValue = renderSlopeValue(t, soilData);

  const shapeValue =
    soilData.downSlope && soilData.crossSlope
      ? `${t(`slope.shape.select_labels.${soilData.downSlope}`)} ${t(
          `slope.shape.select_labels.${soilData.crossSlope}`,
        )}`
      : undefined;

  const onSteepness = useCallback(
    () => navigation.push('SLOPE_STEEPNESS', {siteId}),
    [navigation, siteId],
  );

  const onShape = useCallback(
    () => navigation.push('SLOPE_SHAPE', {siteId}),
    [navigation, siteId],
  );

  return (
    <Column space="1px">
      <Row backgroundColor="primary.contrast" p="15px" alignItems="center">
        <Heading variant="h6">{t('slope.title')}</Heading>
        {/* TODO */}
        <FormTooltip icon="info">Unimplemented tooltip</FormTooltip>
      </Row>
      <DataSummaryCard
        required={required}
        complete={steepnessValue !== undefined}
        label={t('slope.steepness.short_title').toLocaleUpperCase()}
        value={steepnessValue}
        onPress={onSteepness}
      />
      <DataSummaryCard
        required={required}
        complete={shapeValue !== undefined}
        label={t('slope.shape.title').toLocaleUpperCase()}
        value={shapeValue}
        onPress={onShape}
      />
    </Column>
  );
};
