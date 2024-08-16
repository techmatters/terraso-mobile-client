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

import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet} from 'react-native';

import {ScrollView} from 'native-base';

import {
  SoilIdSoilDataCrossSlopeChoices,
  SoilIdSoilDataDownSlopeChoices,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  selectSoilData,
  selectUserRoleSite,
} from 'terraso-client-shared/selectors';
import {updateSoilData} from 'terraso-client-shared/soilId/soilIdSlice';

import ConcaveConcave from 'terraso-mobile-client/assets/slope/shape/concave-concave.svg';
import ConcaveConvex from 'terraso-mobile-client/assets/slope/shape/concave-convex.svg';
import ConcaveLinear from 'terraso-mobile-client/assets/slope/shape/concave-linear.svg';
import ConvexConcave from 'terraso-mobile-client/assets/slope/shape/convex-concave.svg';
import ConvexConvex from 'terraso-mobile-client/assets/slope/shape/convex-convex.svg';
import ConvexLinear from 'terraso-mobile-client/assets/slope/shape/convex-linear.svg';
import LinearConcave from 'terraso-mobile-client/assets/slope/shape/linear-concave.svg';
import LinearConvex from 'terraso-mobile-client/assets/slope/shape/linear-convex.svg';
import LinearLinear from 'terraso-mobile-client/assets/slope/shape/linear-linear.svg';
import {DoneButton} from 'terraso-mobile-client/components/buttons/DoneButton';
import {InfoButton} from 'terraso-mobile-client/components/buttons/icons/common/InfoButton';
import {HelpContentSpacer} from 'terraso-mobile-client/components/content/HelpContentSpacer';
import {
  ImageRadio,
  ImageRadioOption,
} from 'terraso-mobile-client/components/ImageRadio';
import {
  Column,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/RestrictByRole';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {
  isProjectViewer,
  SITE_EDITOR_ROLES,
} from 'terraso-mobile-client/model/permissions/permissions';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {SlopeShapeInfoContent} from 'terraso-mobile-client/screens/SlopeScreen/components/SlopeShapeInfoContent';
import {renderShape} from 'terraso-mobile-client/screens/SlopeScreen/utils/renderValues';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

type Props = {
  siteId: string;
};

type CombinedSlope =
  `${SoilIdSoilDataDownSlopeChoices}:${SoilIdSoilDataCrossSlopeChoices}`;

export const SlopeShapeScreen = ({siteId}: Props) => {
  const name = useSelector(state => state.site.sites[siteId].name);
  const {t} = useTranslation();
  const {downSlope, crossSlope} = useSelector(selectSoilData(siteId));
  const dispatch = useDispatch();

  const userRole = useSelector(state => selectUserRoleSite(state, siteId));

  const isViewer = useMemo(() => isProjectViewer(userRole), [userRole]);

  const options = useMemo<Record<CombinedSlope, ImageRadioOption>>(
    () => ({
      'CONCAVE:CONCAVE': {
        label: renderShape(t, {downSlope: 'CONCAVE', crossSlope: 'CONCAVE'}),
        image: <ConcaveConcave />,
      },
      'CONCAVE:CONVEX': {
        label: renderShape(t, {downSlope: 'CONCAVE', crossSlope: 'CONVEX'}),
        image: <ConcaveConvex />,
      },
      'CONCAVE:LINEAR': {
        label: renderShape(t, {downSlope: 'CONCAVE', crossSlope: 'LINEAR'}),
        image: <ConcaveLinear />,
      },
      'CONVEX:CONCAVE': {
        label: renderShape(t, {downSlope: 'CONVEX', crossSlope: 'CONCAVE'}),
        image: <ConvexConcave />,
      },
      'CONVEX:CONVEX': {
        label: renderShape(t, {downSlope: 'CONVEX', crossSlope: 'CONVEX'}),
        image: <ConvexConvex />,
      },
      'CONVEX:LINEAR': {
        label: renderShape(t, {downSlope: 'CONVEX', crossSlope: 'LINEAR'}),
        image: <ConvexLinear />,
      },
      'LINEAR:CONCAVE': {
        label: renderShape(t, {downSlope: 'LINEAR', crossSlope: 'CONCAVE'}),
        image: <LinearConcave />,
      },
      'LINEAR:CONVEX': {
        label: renderShape(t, {downSlope: 'LINEAR', crossSlope: 'CONVEX'}),
        image: <LinearConvex />,
      },
      'LINEAR:LINEAR': {
        label: renderShape(t, {downSlope: 'LINEAR', crossSlope: 'LINEAR'}),
        image: <LinearLinear />,
      },
    }),
    [t],
  );

  const onChange = useCallback(
    (value: CombinedSlope | null) => {
      const [newDownSlope, newCrossSlope] =
        value === null
          ? [null, null]
          : (value.split(':') as [
              SoilIdSoilDataDownSlopeChoices,
              SoilIdSoilDataCrossSlopeChoices,
            ]);
      dispatch(
        updateSoilData({
          siteId,
          downSlope: newDownSlope,
          crossSlope: newCrossSlope,
        }),
      );
    },
    [dispatch, siteId],
  );

  return (
    <ScreenScaffold AppBar={<AppBar title={name} />} BottomNavigation={null}>
      <SiteRoleContextProvider siteId={siteId}>
        <ScrollView
          bg="primary.contrast"
          _contentContainerStyle={styles.scrollContentContainer}>
          <Column>
            <Column p="15px" bg="primary.contrast">
              <Row alignItems="center">
                <Heading variant="h6">{t('slope.shape.long_title')}</Heading>
                <HelpContentSpacer />
                <InfoButton sheetHeading={t('slope.shape.info.title')}>
                  <SlopeShapeInfoContent />
                </InfoButton>
              </Row>
            </Column>
          </Column>
          <ImageRadio
            value={
              downSlope && crossSlope ? `${downSlope}:${crossSlope}` : undefined
            }
            options={options}
            onChange={isViewer ? () => {} : onChange}
            minimumPerRow={3}
          />
        </ScrollView>
        <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
          <DoneButton />
        </RestrictBySiteRole>
      </SiteRoleContextProvider>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  scrollContentContainer: {
    paddingBottom: 100,
  },
});
