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
import {
  SoilPitInputScreenProps,
  SoilPitInputScreenScaffold,
} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {
  Box,
  Column,
  Heading,
  Paragraph,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useTranslation} from 'react-i18next';
import {InfoModal} from 'terraso-mobile-client/components/modals/InfoModal';
import {BulletList} from 'terraso-mobile-client/components/BulletList';
import {pitMethodSummary} from 'terraso-mobile-client/screens/SoilScreen/utils/renderValues';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectDepthDependentData} from 'terraso-client-shared/selectors';
import {Button, Fab} from 'native-base';
import {SwitchWorkflowButton} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/SwitchWorkflowButton';
import {DepthDependentSelect} from 'terraso-mobile-client/screens/SoilScreen/components/DepthDependentSelect';
import {ColorDisplay} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/ColorDisplay';
import {
  colorHues,
  colorValues,
  colorChromas,
  updateDepthDependentSoilData,
  colorHueSubsteps,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {LastModified} from 'terraso-mobile-client/components/LastModified';
import {Pressable} from 'react-native';
import {useCallback, useMemo, useState} from 'react';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {PhotoConditions} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/PhotoConditions';
import {Select} from 'terraso-mobile-client/components/inputs/Select';
import {
  MunsellColor,
  parseMunsellHue,
  renderMunsellHue,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/munsellConversions';
import {ImagePicker, Photo} from 'terraso-mobile-client/components/ImagePicker';

export type ColorWorkflow = 'MANUAL' | 'CAMERA';

export const ColorScreen = (props: SoilPitInputScreenProps) => {
  const {t} = useTranslation();
  const data = useSelector(selectDepthDependentData(props));
  const {complete} = pitMethodSummary(t, data, 'soilColor');
  const previousWorkflow = useSelector(
    state => state.preferences.colorWorkflow,
  );
  const siteWorkflow =
    typeof data?.colorPhotoUsed !== 'boolean'
      ? undefined
      : data.colorPhotoUsed
        ? 'CAMERA'
        : 'MANUAL';

  const workflow = siteWorkflow ?? previousWorkflow;

  const navigation = useNavigation();

  const onPickImage = useCallback(
    (photo: Photo) => {
      navigation.navigate('COLOR_ANALYSIS', {
        photo: photo,
        pitProps: props,
      });
    },
    [navigation, props],
  );

  const onUseGuide = useCallback(
    () => navigation.navigate('COLOR_GUIDE', props),
    [props, navigation],
  );

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

  const onClearValues = useCallback(() => {
    dispatch(
      updateDepthDependentSoilData({
        siteId: props.siteId,
        depthInterval: props.depthInterval.depthInterval,
        colorHue: null,
        colorValue: null,
        colorChroma: null,
      }),
    );
  }, [props.siteId, props.depthInterval, dispatch]);

  const color: MunsellColor | undefined = useMemo(
    () =>
      data?.colorHue && data?.colorChroma && data?.colorValue
        ? {
            colorHue: data?.colorHue,
            colorChroma: data?.colorChroma,
            colorValue: data?.colorValue,
          }
        : undefined,
    [data],
  );

  return (
    <SoilPitInputScreenScaffold {...props}>
      <Column padding="md">
        <Row alignItems="flex-end">
          <Row alignItems="center">
            <Heading variant="h6">{t('soil.color.title')}</Heading>
            <InfoModal Header={t('soil.color.title')}>
              <Paragraph variant="body1">{t('soil.color.info.p1')}</Paragraph>
              <BulletList
                data={[1, 2, 3]}
                renderItem={i => (
                  <Text variant="body1">{t(`soil.color.info.bullet${i}`)}</Text>
                )}
              />
              <Paragraph variant="body1">{t('soil.color.info.p2')}</Paragraph>
              <Paragraph variant="body1">{t('soil.color.info.p3')}</Paragraph>
            </InfoModal>
          </Row>
          <Box flex={1} />
          {(workflow === 'CAMERA' || complete) && (
            <SwitchWorkflowButton {...props} />
          )}
        </Row>
        <LastModified />
      </Column>
      {workflow === 'MANUAL' && (
        <>
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
        </>
      )}
      {workflow === 'CAMERA' && !complete && (
        <>
          <Box alignItems="center" paddingVertical="lg">
            <ImagePicker onPick={onPickImage}>
              {onOpen => (
                <Pressable onPress={onOpen}>
                  <Box
                    borderRadius="24px"
                    width="180px"
                    height="180px"
                    justifyContent="center"
                    alignItems="center"
                    borderStyle="dashed"
                    borderWidth="2px"
                    borderColor="grey.700">
                    <Icon
                      name="add-photo-alternate"
                      color="action.active"
                      size="lg"
                    />
                  </Box>
                </Pressable>
              )}
            </ImagePicker>
          </Box>
          <Column
            backgroundColor="grey.300"
            paddingHorizontal="md"
            paddingVertical="lg"
            alignItems="flex-start">
            <Paragraph>{t('soil.color.photo_need_help')}</Paragraph>
            <Button
              _text={{textTransform: 'uppercase'}}
              onPress={onUseGuide}
              rightIcon={<Icon name="chevron-right" />}>
              {t('soil.color.use_guide_label')}
            </Button>
          </Column>
        </>
      )}
      {color && (
        <>
          <ColorDisplay
            onDelete={workflow === 'CAMERA' ? onClearValues : undefined}
            color={color}
            dimensions={180}
          />
          {workflow === 'CAMERA' && <PhotoConditions {...props} />}
        </>
      )}
      <Fab
        label={t('general.done')}
        leftIcon={<Icon name="check" />}
        isDisabled={!complete}
        onPress={() => navigation.pop()}
      />
    </SoilPitInputScreenScaffold>
  );
};
