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

import {useCallback, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Image, StyleSheet} from 'react-native';

import {Button, ScrollView} from 'native-base';

import {SoilIdSoilDataSlopeSteepnessSelectChoices} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  selectSoilData,
  selectUserRoleSite,
} from 'terraso-client-shared/selectors';
import {updateSoilData} from 'terraso-client-shared/soilId/soilIdSlice';

import {DoneButton} from 'terraso-mobile-client/components/buttons/DoneButton';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  ImageRadio,
  radioImage,
} from 'terraso-mobile-client/components/ImageRadio';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {
  Modal,
  ModalHandle,
} from 'terraso-mobile-client/components/modals/Modal';
import {
  Box,
  Column,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/RestrictByRole';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {ManualSteepnessModal} from 'terraso-mobile-client/screens/SlopeScreen/components/ManualSteepnessModal';
import {
  renderSlopeSteepnessSelectInline,
  renderSteepness,
} from 'terraso-mobile-client/screens/SlopeScreen/utils/renderValues';
import {STEEPNESS_IMAGES} from 'terraso-mobile-client/screens/SlopeScreen/utils/steepnessImages';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

type Props = {
  siteId: string;
};

export const SlopeSteepnessScreen = ({siteId}: Props) => {
  const name = useSelector(state => state.site.sites[siteId].name);
  const {t} = useTranslation();
  const soilData = useSelector(selectSoilData(siteId));
  const dispatch = useDispatch();
  const [steepnessOption, setSteepnessOption] =
    useState<SoilIdSoilDataSlopeSteepnessSelectChoices | null>(null);
  const confirmationModalRef = useRef<ModalHandle>(null);
  const navigation = useNavigation();

  const userRole = useSelector(state => selectUserRoleSite(state, siteId));

  const isViewer = useMemo(
    () => Boolean(userRole && ['VIEWER'].includes(userRole.role)),
    [userRole],
  );

  const steepnessOptions = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(STEEPNESS_IMAGES).map(([value, image]) => [
          value,
          {
            label: renderSlopeSteepnessSelectInline(t, value),
            image: <Image style={radioImage} source={image} />,
          },
        ]),
      ),
    [t],
  );

  const onChange = useCallback(
    (value: SoilIdSoilDataSlopeSteepnessSelectChoices | null) => {
      dispatch(
        updateSoilData({
          siteId,
          slopeSteepnessSelect: value,
          slopeSteepnessDegree: null,
          slopeSteepnessPercent: null,
        }),
      );
    },
    [dispatch, siteId],
  );

  const onSteepnessOptionSelected = useCallback(
    (value: SoilIdSoilDataSlopeSteepnessSelectChoices | null) => {
      if (
        typeof soilData.slopeSteepnessDegree === 'number' ||
        typeof soilData.slopeSteepnessPercent === 'number'
      ) {
        setSteepnessOption(value);
        confirmationModalRef.current?.onOpen();
      } else {
        onChange(value);
      }
    },
    [setSteepnessOption, confirmationModalRef, onChange, soilData],
  );

  const onConfirmSteepness = useCallback(() => {
    onChange(steepnessOption);
    confirmationModalRef.current?.onClose();
  }, [onChange, steepnessOption]);

  const onMeter = useCallback(
    () => navigation.push('SLOPE_METER', {siteId}),
    [navigation, siteId],
  );

  return (
    <ScreenScaffold AppBar={<AppBar title={name} />} BottomNavigation={null}>
      <SiteRoleContextProvider siteId={siteId}>
        <ScrollView
          bg="primary.contrast"
          _contentContainerStyle={styles.scrollContentContainer}>
          <Column>
            <Column p="15px" bg="primary.contrast">
              <Heading variant="h6">{t('slope.steepness.long_title')}</Heading>
            </Column>
          </Column>
          <Column p="15px" bg="grey.300">
            <RestrictBySiteRole
              role={[
                {kind: 'site', role: 'OWNER'},
                {kind: 'project', role: 'MANAGER'},
                {kind: 'project', role: 'CONTRIBUTOR'},
              ]}>
              <Text variant="body1">{t('slope.steepness.description')}</Text>
              <Box height="30px" />
              <Row justifyContent="space-between">
                <Modal
                  trigger={onOpen => (
                    <Button
                      onPress={onOpen}
                      _text={{textTransform: 'uppercase'}}
                      rightIcon={<Icon name="chevron-right" />}>
                      {t('slope.steepness.manual_label')}
                    </Button>
                  )}>
                  <ManualSteepnessModal siteId={siteId} />
                </Modal>
                <Button
                  _text={{textTransform: 'uppercase'}}
                  rightIcon={<Icon name="chevron-right" />}
                  onPress={onMeter}>
                  {t('slope.steepness.slope_meter')}
                </Button>
              </Row>
              <Box height="15px" />
            </RestrictBySiteRole>
            <Text variant="body1" fontWeight={700} alignSelf="center">
              {renderSteepness(t, soilData)}
            </Text>
          </Column>
          <ConfirmModal
            ref={confirmationModalRef}
            title={t('slope.steepness.confirm_title')}
            body={t('slope.steepness.confirm_body')}
            actionName={t('general.change')}
            handleConfirm={onConfirmSteepness}
            isConfirmError={false}
          />
          <ImageRadio
            value={soilData.slopeSteepnessSelect}
            options={steepnessOptions as any}
            onChange={isViewer ? () => {} : onSteepnessOptionSelected}
            minimumPerRow={2}
          />
        </ScrollView>
        <RestrictBySiteRole
          role={[
            {kind: 'project', role: 'MANAGER'},
            {kind: 'project', role: 'CONTRIBUTOR'},
            {kind: 'site', role: 'OWNER'},
          ]}>
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
