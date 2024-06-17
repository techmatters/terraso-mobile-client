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

import {Button, ScrollView} from 'native-base';

import {SoilIdSoilDataDepthIntervalPresetChoices} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  selectSoilData,
  useSiteProjectSoilSettings,
  useSiteSoilIntervals,
} from 'terraso-client-shared/selectors';
import {
  LabelledDepthInterval,
  methodRequired,
  soilPitMethods,
  updateSoilData,
  updateSoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';

import {AddIntervalModalBody} from 'terraso-mobile-client/components/AddIntervalModal';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {IconButton} from 'terraso-mobile-client/components/icons/IconButton';
import {Modal} from 'terraso-mobile-client/components/modals/Modal';
import {
  Box,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/RestrictByRole';
import {OverlaySheet} from 'terraso-mobile-client/components/sheets/OverlaySheet';
import {EditSiteSoilDepthPreset} from 'terraso-mobile-client/screens/SoilScreen/components/EditSiteSoilDepthPreset';
import {SoilDepthIntervalSummary} from 'terraso-mobile-client/screens/SoilScreen/components/SoilDepthIntervalSummary';
import {SoilSurfaceStatus} from 'terraso-mobile-client/screens/SoilScreen/components/SoilSurfaceStatus';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const SoilScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const soilData = useSelector(selectSoilData(siteId));
  const projectSettings = useSiteProjectSoilSettings(siteId);

  const projectRequiredInputs = useMemo(() => {
    return soilPitMethods.filter(m => projectSettings?.[methodRequired(m)]);
  }, [projectSettings]);

  const allIntervals = useSiteSoilIntervals(siteId);
  const existingIntervals = useMemo(
    () => allIntervals.map(({interval}) => interval),
    [allIntervals],
  );

  const dispatch = useDispatch();

  const onAddDepthInterval = useCallback(
    async (interval: LabelledDepthInterval) => {
      await dispatch(updateSoilDataDepthInterval({siteId, ...interval}));
    },
    [siteId, dispatch],
  );

  const updateSoilDataDepthPreset = useCallback(
    (newDepthPreset: SoilIdSoilDataDepthIntervalPresetChoices) => {
      dispatch(updateSoilData({siteId, depthIntervalPreset: newDepthPreset}));
    },
    [dispatch, siteId],
  );

  return (
    <ScrollView backgroundColor="grey.300">
      <SoilSurfaceStatus siteId={siteId} />
      <Box height="16px" />
      <Row
        backgroundColor="background.default"
        px="16px"
        py="12px"
        justifyContent="space-between">
        <Heading variant="h6">{t('soil.pit')}</Heading>
        {!projectSettings && (
          <OverlaySheet
            Header={
              <Heading variant="h6">{t('soil.soil_preset.header')}</Heading>
            }
            trigger={onOpen => (
              <IconButton
                name="tune"
                _icon={{color: 'action.active'}}
                onPress={onOpen}
              />
            )}>
            <EditSiteSoilDepthPreset
              selected={soilData.depthIntervalPreset}
              updateChoice={updateSoilDataDepthPreset}
            />
          </OverlaySheet>
        )}
      </Row>
      {allIntervals.map(interval => (
        <SoilDepthIntervalSummary
          key={`${interval.interval.depthInterval.start}:${interval.interval.depthInterval.end}`}
          siteId={siteId}
          interval={interval}
          requiredInputs={projectRequiredInputs}
        />
      ))}
      <RestrictBySiteRole
        role={[
          {kind: 'project', role: 'MANAGER'},
          {kind: 'project', role: 'CONTRIBUTOR'},
          {kind: 'site', role: 'OWNER'},
        ]}>
        <Modal
          trigger={onOpen => (
            <Button
              size="lg"
              variant="fullWidth"
              backgroundColor="primary.dark"
              justifyContent="start"
              _text={{
                color: 'primary.contrast',
              }}
              _icon={{
                color: 'primary.contrast',
              }}
              width="full"
              borderRadius="0px"
              leftIcon={<Icon name="add" />}
              onPress={onOpen}>
              {t('soil.add_depth_label')}
            </Button>
          )}
          Header={
            <Heading variant="h6">{t('soil.depth_interval.add_title')}</Heading>
          }>
          <AddIntervalModalBody
            onSubmit={onAddDepthInterval}
            existingIntervals={existingIntervals}
          />
        </Modal>
      </RestrictBySiteRole>
    </ScrollView>
  );
};
