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

import {Box, Column, Fab, Heading, Row, ScrollView} from 'native-base';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {
  SoilIdSoilDataCrossSlopeChoices,
  SoilIdSoilDataDownSlopeChoices,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useTranslation} from 'react-i18next';
import {LastModified} from 'terraso-mobile-client/components/LastModified';
import {ImageRadio} from 'terraso-mobile-client/components/ImageRadio';
import {useCallback, useMemo} from 'react';
import {updateSoilData} from 'terraso-client-shared/soilId/soilIdSlice';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {StyleSheet} from 'react-native';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

type Props = {
  siteId: string;
};

const DOWN_SLOPE_IMAGES = {
  CONCAVE: require('terraso-mobile-client/assets/slope/shape/down-slope-concave.png'),
  CONVEX: require('terraso-mobile-client/assets/slope/shape/down-slope-convex.png'),
  LINEAR: require('terraso-mobile-client/assets/slope/shape/down-slope-linear.png'),
} satisfies Record<SoilIdSoilDataDownSlopeChoices, any>;

const CROSS_SLOPE_IMAGES = {
  CONCAVE: require('terraso-mobile-client/assets/slope/shape/cross-slope-concave.png'),
  CONVEX: require('terraso-mobile-client/assets/slope/shape/cross-slope-convex.png'),
  LINEAR: require('terraso-mobile-client/assets/slope/shape/cross-slope-linear.png'),
} satisfies Record<SoilIdSoilDataCrossSlopeChoices, any>;

export const SlopeShapeScreen = ({siteId}: Props) => {
  const name = useSelector(state => state.site.sites[siteId].name);
  const {t} = useTranslation();
  const {downSlope, crossSlope} = useSelector(
    state => state.soilId.soilData[siteId],
  );
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const downSlopeOptions = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(DOWN_SLOPE_IMAGES).map(([value, image]) => [
          value,
          {label: t(`slope.shape.select_labels.${value}`), image},
        ]),
      ),
    [t],
  );

  const crossSlopeOptions = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(CROSS_SLOPE_IMAGES).map(([value, image]) => [
          value,
          {label: t(`slope.shape.select_labels.${value}`), image},
        ]),
      ),
    [t],
  );

  const onDownSlopeChange = useCallback(
    (value: SoilIdSoilDataDownSlopeChoices | null) => {
      dispatch(
        updateSoilData({
          siteId,
          downSlope: value,
        }),
      );
    },
    [dispatch, siteId],
  );

  const onCrossSlopeChange = useCallback(
    (value: SoilIdSoilDataCrossSlopeChoices | null) => {
      dispatch(
        updateSoilData({
          siteId,
          crossSlope: value,
        }),
      );
    },
    [dispatch, siteId],
  );

  return (
    <ScreenScaffold AppBar={<AppBar title={name} />} BottomNavigation={null}>
      <ScrollView
        bg="primary.contrast"
        _contentContainerStyle={styles.scrollContentContainer}>
        <Column>
          <Column p="15px" bg="primary.contrast">
            <Heading variant="h6">{t('slope.shape.long_title')}</Heading>
            <LastModified />
          </Column>
        </Column>
        <Row>
          <Column width="50%" alignItems="center">
            <Heading variant="h6">{t('slope.shape.down_slope')}</Heading>
            <ImageRadio
              value={downSlope}
              options={downSlopeOptions as any}
              onChange={onDownSlopeChange}
            />
          </Column>
          <Box width={StyleSheet.hairlineWidth} bg="grey.800" my="50px" />
          <Column width="50%" alignItems="center">
            <Heading variant="h6">{t('slope.shape.cross_slope')}</Heading>
            <ImageRadio
              value={crossSlope}
              options={crossSlopeOptions as any}
              onChange={onCrossSlopeChange}
            />
          </Column>
        </Row>
      </ScrollView>
      <Fab
        onPress={() => navigation.pop()}
        leftIcon={<Icon name="check" />}
        label={t('general.done_fab')}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  scrollContentContainer: {
    paddingBottom: 100,
  },
});
