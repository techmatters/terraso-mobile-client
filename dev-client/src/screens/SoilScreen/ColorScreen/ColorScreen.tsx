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

import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {
  selectDepthDependentData,
  selectUserRoleSite,
} from 'terraso-client-shared/selectors';
import {updateDepthDependentSoilData} from 'terraso-client-shared/soilId/soilIdSlice';

import {BulletList} from 'terraso-mobile-client/components/BulletList';
import {DoneButton} from 'terraso-mobile-client/components/buttons/DoneButton';
import {InfoButton} from 'terraso-mobile-client/components/buttons/icons/common/InfoButton';
import {HelpContentSpacer} from 'terraso-mobile-client/components/content/HelpContentSpacer';
import {
  Box,
  Column,
  Heading,
  Paragraph,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/RestrictByRole';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {
  isColorComplete,
  MunsellColor,
} from 'terraso-mobile-client/model/color/munsellConversions';
import {
  isProjectEditor,
  SITE_EDITOR_ROLES,
} from 'terraso-mobile-client/model/permissions/permissions';
import {CameraWorkflow} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/CameraWorkflow';
import {ColorDisplay} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/ColorDisplay';
import {ManualWorkflow} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/ManualWorkflow';
import {PhotoConditions} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/PhotoConditions';
import {SwitchWorkflowButton} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/SwitchWorkflowButton';
import {
  SoilPitInputScreenProps,
  SoilPitInputScreenScaffold,
} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

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

  const userRole = useSelector(state =>
    selectUserRoleSite(state, props.siteId),
  );

  const canDelete = useMemo(() => isProjectEditor(userRole), [userRole]);

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
      <SiteRoleContextProvider siteId={props.siteId}>
        <Column padding="md">
          <Row alignItems="flex-end">
            <Row alignItems="center">
              <Heading variant="h6">{t('soil.color.title')}</Heading>
              <HelpContentSpacer />
              <InfoButton Header={t('soil.color.title')}>
                <Paragraph variant="body1">{t('soil.color.info.p1')}</Paragraph>
                <BulletList
                  data={[1, 2, 3]}
                  renderItem={i => (
                    <Text variant="body1">
                      {t(`soil.color.info.bullet${i}`)}
                    </Text>
                  )}
                />
                <Paragraph variant="body1">{t('soil.color.info.p2')}</Paragraph>
                <Paragraph variant="body1">{t('soil.color.info.p3')}</Paragraph>
              </InfoButton>
            </Row>
            <Box flex={1} />
            <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
              {(workflow === 'CAMERA' || color) && (
                <SwitchWorkflowButton {...props} />
              )}
            </RestrictBySiteRole>
          </Row>
        </Column>
        {workflow === 'MANUAL' && <ManualWorkflow {...props} />}
        {workflow === 'CAMERA' && !color && <CameraWorkflow {...props} />}
        {color && (
          <>
            <ColorDisplay
              onDelete={
                canDelete && workflow === 'CAMERA' ? onClearValues : undefined
              }
              color={color}
              variant="lg"
            />
            {workflow === 'CAMERA' && <PhotoConditions {...props} />}
          </>
        )}
        <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
          <Box position="absolute" right="0" bottom="0">
            <DoneButton isDisabled={!color} />
          </Box>
        </RestrictBySiteRole>
      </SiteRoleContextProvider>
    </SoilPitInputScreenScaffold>
  );
};
