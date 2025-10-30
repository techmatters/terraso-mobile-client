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

import {SoilIdSoilDataDepthIntervalPresetChoices} from 'terraso-client-shared/graphqlSchema/graphql';

import {TextButton} from 'terraso-mobile-client/components/buttons/TextButton';
import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {useNavToBottomTabsAndShowSyncError} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {
  Box,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/restrictions/RestrictByRole';
import {SafeScrollView} from 'terraso-mobile-client/components/SafeScrollView';
import {InfoSheet} from 'terraso-mobile-client/components/sheets/InfoSheet';
import {SITE_EDITOR_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {
  methodRequired,
  soilPitMethods,
  updateSoilData,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {AddDepthOverlaySheet} from 'terraso-mobile-client/screens/SoilScreen/components/AddDepthOverlaySheet';
import {AddSoilDepthButton} from 'terraso-mobile-client/screens/SoilScreen/components/AddSoilDepthButton';
import {EditSiteSoilDepthPreset} from 'terraso-mobile-client/screens/SoilScreen/components/EditSiteSoilDepthPreset';
import {SoilDepthSummary} from 'terraso-mobile-client/screens/SoilScreen/components/SoilDepthSummary';
import {SoilSurfaceStatus} from 'terraso-mobile-client/screens/SoilScreen/components/SoilSurfaceStatus';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {
  selectSite,
  selectSoilData,
  useSiteProjectSoilSettings,
  useSiteSoilIntervals,
} from 'terraso-mobile-client/store/selectors';

export const SoilScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const soilData = useSelector(selectSoilData(siteId));
  const projectSettings = useSiteProjectSoilSettings(siteId);

  const projectRequiredInputs = useMemo(() => {
    return soilPitMethods.filter(m => projectSettings?.[methodRequired(m)]);
  }, [projectSettings]);

  const allDepths = useSiteSoilIntervals(siteId);
  const existingDepths = useMemo(
    () => allDepths.map(({interval}) => interval),
    [allDepths],
  );

  const dispatch = useDispatch();

  const updateSoilDataDepthPreset = useCallback(
    (newDepthPreset: SoilIdSoilDataDepthIntervalPresetChoices) => {
      dispatch(updateSoilData({siteId, depthIntervalPreset: newDepthPreset}));
    },
    [dispatch, siteId],
  );

  const site = useSelector(selectSite(siteId));
  const handleMissingSite = useNavToBottomTabsAndShowSyncError();
  const requirements = useMemoizedRequirements([
    {data: site, doIfMissing: handleMissingSite},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <SafeScrollView backgroundColor="grey.300">
          <SoilSurfaceStatus siteId={siteId} />
          <Box height="16px" />
          <Row
            backgroundColor="background.default"
            px="16px"
            py="12px"
            justifyContent="space-between"
            alignItems="center">
            <Heading variant="h6">{t('soil.pit')}</Heading>
            {!projectSettings && (
              <InfoSheet
                heading={
                  <TranslatedHeading i18nKey="soil.soil_preset.header" />
                }
                trigger={onOpen => (
                  <TextButton
                    label={t('soil.soil_preset.label')}
                    rightIcon="expand-more"
                    onPress={onOpen}
                  />
                )}>
                <EditSiteSoilDepthPreset
                  selected={soilData.depthIntervalPreset}
                  updateChoice={updateSoilDataDepthPreset}
                />
              </InfoSheet>
            )}
          </Row>
          {allDepths.map(interval => (
            <SoilDepthSummary
              key={`${interval.interval.depthInterval.start}:${interval.interval.depthInterval.end}`}
              siteId={siteId}
              interval={interval}
              requiredInputs={projectRequiredInputs}
            />
          ))}
          <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
            <AddDepthOverlaySheet
              siteId={siteId}
              existingDepths={existingDepths}
              requiredInputs={projectRequiredInputs}
              siteInProject={!!site.projectId}
              trigger={onOpen => <AddSoilDepthButton onPress={onOpen} />}
            />
          </RestrictBySiteRole>
        </SafeScrollView>
      )}
    </ScreenDataRequirements>
  );
};
