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
import {BulletList} from 'terraso-mobile-client/components/BulletList';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectDepthDependentData} from 'terraso-client-shared/selectors';
import {SwitchWorkflowButton} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/SwitchWorkflowButton';
import {ColorDisplay} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/ColorDisplay';
import {updateDepthDependentSoilData} from 'terraso-client-shared/soilId/soilIdSlice';
import {useCallback, useMemo} from 'react';
import {PhotoConditions} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/PhotoConditions';
import {MunsellColor} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/munsellConversions';
import {ManualWorkflow} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/ManualWorkflow';
import {CameraWorkflow} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/CameraWorkflow';
import {isColorComplete} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/soilColorValidation';
import {InfoOverlaySheetButton} from 'terraso-mobile-client/components/sheets/InfoOverlaySheetButton';
import {DoneButton} from 'terraso-mobile-client/components/buttons/DoneButton';

export type ColorWorkflow = 'MANUAL' | 'CAMERA';

export const ColorScreen = (props: SoilPitInputScreenProps) => {
  const {t} = useTranslation();
  const data = useSelector(selectDepthDependentData(props));
  const previousWorkflow = useSelector(
    state => state.preferences.colorWorkflow,
  );
  const siteWorkflow =
    typeof data.colorPhotoUsed !== 'boolean'
      ? undefined
      : data.colorPhotoUsed
        ? 'CAMERA'
        : 'MANUAL';

  const workflow = siteWorkflow ?? previousWorkflow;

  const dispatch = useDispatch();

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
    () => (isColorComplete(data) ? data : undefined),
    [data],
  );

  return (
    <SoilPitInputScreenScaffold {...props}>
      <Column padding="md">
        <Row alignItems="flex-end">
          <Row alignItems="center">
            <Heading variant="h6">{t('soil.color.title')}</Heading>
            <InfoOverlaySheetButton Header={t('soil.color.title')}>
              <Paragraph variant="body1">{t('soil.color.info.p1')}</Paragraph>
              <BulletList
                data={[1, 2, 3]}
                renderItem={i => (
                  <Text variant="body1">{t(`soil.color.info.bullet${i}`)}</Text>
                )}
              />
              <Paragraph variant="body1">{t('soil.color.info.p2')}</Paragraph>
              <Paragraph variant="body1">{t('soil.color.info.p3')}</Paragraph>
            </InfoOverlaySheetButton>
          </Row>
          <Box flex={1} />
          {(workflow === 'CAMERA' || color) && (
            <SwitchWorkflowButton {...props} />
          )}
        </Row>
      </Column>
      {workflow === 'MANUAL' && <ManualWorkflow {...props} />}
      {workflow === 'CAMERA' && !color && <CameraWorkflow {...props} />}
      {color && (
        <>
          <ColorDisplay
            onDelete={workflow === 'CAMERA' ? onClearValues : undefined}
            color={color}
            variant="lg"
          />
          {workflow === 'CAMERA' && <PhotoConditions {...props} />}
        </>
      )}
      <DoneButton isDisabled={!color} />
    </SoilPitInputScreenScaffold>
  );
};
