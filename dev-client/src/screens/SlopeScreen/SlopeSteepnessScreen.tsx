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

import {Button, Fab, ScrollView} from 'native-base';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {LastModified} from 'terraso-mobile-client/components/LastModified';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {renderSteepness} from 'terraso-mobile-client/screens/SlopeScreen/utils/renderValues';
import {
  ImageRadio,
  radioImage,
} from 'terraso-mobile-client/components/ImageRadio';
import {useCallback, useMemo, useRef, useState} from 'react';
import {SoilIdSoilDataSlopeSteepnessSelectChoices} from 'terraso-client-shared/graphqlSchema/graphql';
import {updateSoilData} from 'terraso-client-shared/soilId/soilIdSlice';
import {Modal, ModalHandle} from 'terraso-mobile-client/components/Modal';
import {ManualSteepnessModal} from 'terraso-mobile-client/screens/SlopeScreen/components/ManualSteepnessModal';
import {Image, ImageSourcePropType, StyleSheet} from 'react-native';
import {ConfirmModal} from 'terraso-mobile-client/components/ConfirmModal';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  Box,
  Column,
  Row,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = {
  siteId: string;
};

const STEEPNESS_IMAGES = {
  FLAT: require('terraso-mobile-client/assets/slope/steepness/flat.png'),
  GENTLE: require('terraso-mobile-client/assets/slope/steepness/gentle.png'),
  MODERATE: require('terraso-mobile-client/assets/slope/steepness/moderate.png'),
  ROLLING: require('terraso-mobile-client/assets/slope/steepness/rolling.png'),
  HILLY: require('terraso-mobile-client/assets/slope/steepness/hilly.png'),
  STEEP: require('terraso-mobile-client/assets/slope/steepness/steep.png'),
  MODERATELY_STEEP: require('terraso-mobile-client/assets/slope/steepness/moderately-steep.png'),
  VERY_STEEP: require('terraso-mobile-client/assets/slope/steepness/very-steep.png'),
  STEEPEST: require('terraso-mobile-client/assets/slope/steepness/steepest.png'),
} satisfies Record<
  SoilIdSoilDataSlopeSteepnessSelectChoices,
  ImageSourcePropType
> as Record<SoilIdSoilDataSlopeSteepnessSelectChoices, ImageSourcePropType>;

export const SlopeSteepnessScreen = ({siteId}: Props) => {
  const name = useSelector(state => state.site.sites[siteId].name);
  const {t} = useTranslation();
  const soilData = useSelector(state => state.soilId.soilData[siteId]);
  const dispatch = useDispatch();
  const [steepnessOption, setSteepnessOption] =
    useState<SoilIdSoilDataSlopeSteepnessSelectChoices | null>(null);
  const confirmationModalRef = useRef<ModalHandle>(null);
  const navigation = useNavigation();

  const steepnessOptions = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(STEEPNESS_IMAGES).map(([value, image]) => [
          value,
          {
            label: t(`slope.steepness.select_labels.${value}`),
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
      <ScrollView
        bg="primary.contrast"
        _contentContainerStyle={styles.scrollContentContainer}>
        <Column>
          <Column p="15px" bg="primary.contrast">
            <Heading variant="h6">{t('slope.steepness.long_title')}</Heading>
            <LastModified />
          </Column>
        </Column>
        <Column p="15px" bg="grey.300">
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
          onChange={onSteepnessOptionSelected}
          minimumPerRow={2}
        />
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
