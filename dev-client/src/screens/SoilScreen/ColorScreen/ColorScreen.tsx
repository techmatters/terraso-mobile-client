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
import {BottomSheetTooltip} from 'terraso-mobile-client/components/BottomSheetTooltip';
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
} from 'terraso-client-shared/soilId/soilIdSlice';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {LastModified} from 'terraso-mobile-client/components/LastModified';
import {Pressable} from 'react-native';
import {useCallback, useMemo, useState} from 'react';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {PhotoConditions} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/PhotoConditions';
import {FormSelect} from 'terraso-mobile-client/components/form/FormSelect';
import {fromEntries} from 'terraso-client-shared/utils';
import {
  parseMunsellHue,
  renderMunsellHue,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/munsellConversions';
import {ImagePicker, Photo} from 'terraso-mobile-client/components/ImagePicker';

export type ColorWorkflow = 'MANUAL' | 'CAMERA';

const hueOptions = {
  '2.5': '2.5',
  '5': '5',
  '7.5': '7.5',
  '10': '10',
} as const;

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
        ? renderMunsellHue(data?.colorHue)
        : {hueSubstep: undefined, hue: undefined},
    [data?.colorHue],
  );

  const [selectedSubstep, setSelectedSubstep] = useState(hueSubstep);
  const [selectedHue, setSelectedHue] = useState(hue);

  const dispatch = useDispatch();

  const updateHue = useCallback(
    (newSubstep: string, newHue: (typeof colorHues)[number]) => {
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
    (substep: string) => {
      setSelectedSubstep(substep);
      if (selectedHue && substep) {
        updateHue(substep, selectedHue);
      }
    },
    [selectedHue, updateHue],
  );

  const onUpdateHue = useCallback(
    (newHue: (typeof colorHues)[number]) => {
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

  return (
    <SoilPitInputScreenScaffold {...props}>
      <Column padding="md">
        <Row alignItems="flex-end">
          <Row alignItems="center">
            <Heading variant="h6">{t('soil.color.title')}</Heading>
            <BottomSheetTooltip Header={t('soil.color.title')}>
              <Paragraph variant="body1">{t('soil.color.info.p1')}</Paragraph>
              <BulletList
                data={[1, 2, 3]}
                renderItem={i => (
                  <Text variant="body1">{t(`soil.color.info.bullet${i}`)}</Text>
                )}
              />
              <Paragraph variant="body1">{t('soil.color.info.p2')}</Paragraph>
              <Paragraph variant="body1">{t('soil.color.info.p3')}</Paragraph>
            </BottomSheetTooltip>
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
              <FormSelect
                options={hueOptions}
                selectedValue={selectedSubstep}
                placeholder={t('soil.color.hue')}
                flex={2}
                onValueChange={onUpdateSubstep}
              />
              <Box flex={1} />
              <FormSelect
                options={fromEntries(colorHues.map(h => [h, h]))}
                selectedValue={selectedHue}
                placeholder={t('soil.color.hue')}
                flex={2}
                onValueChange={onUpdateHue}
              />
            </Row>
            <Row alignItems="center">
              <DepthDependentSelect
                input="colorValue"
                values={colorValues}
                renderValue={color => color.toString()}
                label={t('soil.color.value')}
                flex={2}
                {...props}
              />
              <Heading variant="h6" textAlign="center" flex={1}>
                /
              </Heading>
              <DepthDependentSelect
                input="colorChroma"
                values={colorChromas}
                renderValue={chroma => chroma.toString()}
                label={t('soil.color.chroma')}
                flex={2}
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
      {complete && (
        <>
          <ColorDisplay
            onDelete={
              complete && workflow === 'CAMERA' ? onClearValues : undefined
            }
            {...props}
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
