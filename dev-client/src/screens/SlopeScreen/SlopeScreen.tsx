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

import {Box, Column, Heading, Row, Text} from 'native-base';
import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {Pressable} from 'react-native';
import {FormTooltip} from 'terraso-mobile-client/components/form/FormTooltip';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {useSelector} from 'terraso-mobile-client/store';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

type DataSummaryCardProps = {
  complete: boolean;
  label: string;
  value?: string;
  onPress: () => void;
};
const DataSummaryCard = ({
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
        {complete && <Icon color="primary.dark" name="check-circle" />}
      </Box>
      <Text variant="body1" fontWeight={700}>
        {label}
      </Text>
      <Box flex={1} />
      <Text variant="body1">{value}</Text>
    </Row>
  </Pressable>
);

export const SlopeScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const {
    slopeSteepnessDegree,
    slopeSteepnessPercent,
    slopeSteepnessSelect,
    downSlope,
    crossSlope,
  } = useSelector(state => state.soilId.soilData[siteId]);
  const navigation = useNavigation();

  const steepnessValue = slopeSteepnessSelect
    ? t(`slope.steepness_labels.${slopeSteepnessSelect}`)
    : slopeSteepnessPercent
      ? t(`${slopeSteepnessPercent.toFixed(0)}%`)
      : slopeSteepnessDegree
        ? t(`${slopeSteepnessDegree}°`)
        : undefined;

  const shapeValue =
    downSlope && crossSlope
      ? `${t(`slope.shape_labels.${downSlope}`)} ${t(
          `slope.shape_labels.${crossSlope}`,
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
        <FormTooltip icon="info">
          {/* TODO: fill out this tooltip */}
        </FormTooltip>
      </Row>
      <DataSummaryCard
        complete={steepnessValue !== undefined}
        label={t('slope.steepness').toUpperCase()}
        value={steepnessValue}
        onPress={onSteepness}
      />
      <DataSummaryCard
        complete={shapeValue !== undefined}
        label={t('slope.shape').toUpperCase()}
        value={shapeValue}
        onPress={onShape}
      />
    </Column>
  );
};
