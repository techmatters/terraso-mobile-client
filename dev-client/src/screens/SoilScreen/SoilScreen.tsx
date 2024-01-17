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

import {Box, Button, Column, Heading, Row, ScrollView} from 'native-base';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {useTranslation} from 'react-i18next';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {AddIntervalModal} from 'terraso-mobile-client/components/AddIntervalModal';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {Modal} from 'terraso-mobile-client/components/Modal';
import {useMemo, useCallback, useEffect} from 'react';
import {
  LabelledDepthInterval,
  SoilData,
  fetchSoilDataForUser,
  methodRequired,
  soilPitMethods,
  updateSoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/RestrictByRole';
import {SoilSurfaceStatus} from './components/SoilSurfaceStatus';
import {SoilDepthIntervalSummary} from 'terraso-mobile-client/screens/SoilScreen/components/SoilDepthIntervalSummary';

export const SoilScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const soilData = useSelector(state => state.soilId.soilData[siteId]) as
    | SoilData
    | undefined;
  const project = useSelector(state => {
    const projectId = state.site.sites[siteId].projectId;
    return projectId ? state.soilId.projectSettings[projectId] : undefined;
  });

  const projectRequiredInputs = useMemo(() => {
    return soilPitMethods.filter(m => (project ?? {})[methodRequired(m)]);
  }, [project]);

  const allIntervals = useMemo(
    () => soilData?.depthIntervals ?? [],
    [soilData],
  );

  const existingIntervals = useMemo(
    () => allIntervals.map(interval => interval.depthInterval),
    [allIntervals],
  );

  const dispatch = useDispatch();

  const currentUserID = useSelector(
    state => state.account.currentUser?.data?.id,
  );

  useEffect(() => {
    if (currentUserID !== undefined) {
      dispatch(fetchSoilDataForUser(currentUserID));
    }
  }, [currentUserID, dispatch]);

  const onAddDepthInterval = useCallback(
    async (interval: LabelledDepthInterval) => {
      await dispatch(updateSoilDataDepthInterval({siteId, ...interval}));
    },
    [siteId, dispatch],
  );

  return (
    <BottomSheetModalProvider>
      <ScrollView>
        <Column backgroundColor="grey.300">
          <SoilSurfaceStatus
            required={project ? project.verticalCrackingRequired : true}
            complete={Boolean(soilData?.surfaceCracksSelect)}
            siteId={siteId}
          />
          <Box height="16px" />
          <Row backgroundColor="background.default" px="16px" py="12px">
            <Heading variant="h6">{t('soil.pit')}</Heading>
          </Row>
          {allIntervals.map(interval => (
            <SoilDepthIntervalSummary
              key={`${interval.depthInterval.start}:${interval.depthInterval.end}`}
              siteId={siteId}
              interval={interval}
              requiredInputs={projectRequiredInputs}
              data={undefined}
            />
          ))}
          <RestrictBySiteRole
            role={[
              {kind: 'project', role: 'manager'},
              {kind: 'project', role: 'contributor'},
              {kind: 'site', role: 'owner'},
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
              )}>
              <AddIntervalModal
                onSubmit={onAddDepthInterval}
                existingIntervals={existingIntervals}
              />
            </Modal>
          </RestrictBySiteRole>
        </Column>
      </ScrollView>
    </BottomSheetModalProvider>
  );
};
