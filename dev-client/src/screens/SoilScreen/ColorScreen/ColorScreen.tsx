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

import {BulletList} from 'terraso-mobile-client/components/BulletList';
import {DoneFab} from 'terraso-mobile-client/components/buttons/common/DoneFab';
import {InfoButton} from 'terraso-mobile-client/components/buttons/icons/common/InfoButton';
import {HelpContentSpacer} from 'terraso-mobile-client/components/content/HelpContentSpacer';
import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {useDefaultSiteDepthRequirements} from 'terraso-mobile-client/components/dataRequirements/commonRequirements';
import {ScreenDataRequirements} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {Photo} from 'terraso-mobile-client/components/inputs/image/ImagePicker';
import {
  Box,
  Column,
  Heading,
  Paragraph,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/restrictions/RestrictByRole';
import {isFlagEnabled} from 'terraso-mobile-client/config/featureFlags';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {isColorComplete} from 'terraso-mobile-client/model/color/colorConversions';
import {MunsellColor} from 'terraso-mobile-client/model/color/types';
import {
  canEditSite,
  SITE_EDITOR_ROLES,
} from 'terraso-mobile-client/model/permissions/permissions';
import {updatePreferences} from 'terraso-mobile-client/model/preferences/preferencesSlice';
import {updateDepthDependentSoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {CombinedColorScreen} from 'terraso-mobile-client/screens/ColorAnalysisScreen/CombinedColorScreen';
import {ColorAnalysisContextState} from 'terraso-mobile-client/screens/ColorAnalysisScreen/context/colorAnalysisContext';
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
import {
  selectDepthDependentData,
  selectUserRoleSite,
} from 'terraso-mobile-client/store/selectors';

export type ColorWorkflow = 'MANUAL' | 'CAMERA';

// The route also carries an optional captured photo (from the preview camera's
// round-trip) which the combined prototype screen consumes.
type ColorScreenProps = SoilPitInputScreenProps & {
  photo?: Photo;
  dngUri?: string;
  initialState?: ColorAnalysisContextState;
};

export const ColorScreen = (allProps: ColorScreenProps) => {
  const {photo, dngUri, initialState, ...props} = allProps;
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

  const canDelete = useMemo(() => canEditSite(userRole), [userRole]);

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

  // "Enter Values" from the combined prototype screen: switch this depth to the
  // manual workflow, which flips the render below to ManualWorkflow.
  const onEnterValues = useCallback(() => {
    dispatch(updatePreferences({colorWorkflow: 'MANUAL'}));
    dispatch(
      updateDepthDependentSoilData({
        siteId: props.siteId,
        depthInterval: props.depthInterval.depthInterval,
        colorPhotoUsed: false,
      }),
    );
  }, [dispatch, props.siteId, props.depthInterval]);

  // The combined screen also owns the "already has a camera colour" state — it
  // shows the result + conditions + a Select Image to redo (the classic result
  // view is kept only for the manual workflow).
  const useCombined =
    isFlagEnabled('FF_colorCombined') && workflow === 'CAMERA';

  const requirements = useDefaultSiteDepthRequirements(
    props.siteId,
    props.depthInterval.depthInterval,
  );

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() =>
        useCombined ? (
          <SiteRoleContextProvider siteId={props.siteId}>
            <CombinedColorScreen
              key={photo?.uri ?? 'empty'}
              pitProps={props}
              photo={photo}
              dngUri={dngUri}
              initialState={initialState}
              existingColor={color}
              onEnterValues={onEnterValues}
            />
          </SiteRoleContextProvider>
        ) : (
          <SoilPitInputScreenScaffold {...props}>
            <SiteRoleContextProvider siteId={props.siteId}>
              <Column padding="md">
                <Row alignItems="flex-end">
                  <Row alignItems="center">
                    <Heading variant="h6">{t('soil.color.title')}</Heading>
                    <HelpContentSpacer />
                    <InfoButton
                      sheetHeading={
                        <TranslatedHeading i18nKey="soil.color.title" />
                      }>
                      <Paragraph variant="body1">
                        {t('soil.color.info.p1')}
                      </Paragraph>
                      <BulletList
                        data={[1, 2, 3]}
                        renderItem={i => (
                          <Text variant="body1">
                            {t(`soil.color.info.bullet${i}`)}
                          </Text>
                        )}
                      />
                      <Paragraph variant="body1">
                        {t('soil.color.info.p2')}
                      </Paragraph>
                      <Paragraph variant="body1">
                        {t('soil.color.info.p3')}
                      </Paragraph>
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
                      canDelete && workflow === 'CAMERA'
                        ? onClearValues
                        : undefined
                    }
                    color={color}
                    variant="lg"
                  />
                  {workflow === 'CAMERA' && <PhotoConditions {...props} />}
                </>
              )}
              <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
                <Box position="absolute" right="0" bottom="0">
                  <DoneFab disabled={!color} />
                </Box>
              </RestrictBySiteRole>
            </SiteRoleContextProvider>
          </SoilPitInputScreenScaffold>
        )
      }
    </ScreenDataRequirements>
  );
};
