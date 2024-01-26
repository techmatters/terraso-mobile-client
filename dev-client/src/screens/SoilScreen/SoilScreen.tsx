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
import {Icon, IconButton} from 'terraso-mobile-client/components/Icons';
import {AddIntervalModal} from 'terraso-mobile-client/components/AddIntervalModal';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {Modal} from 'terraso-mobile-client/components/Modal';
import {BottomSheetModal} from 'terraso-mobile-client/components/BottomSheetModal';
import {EditIntervalModalContent} from 'terraso-mobile-client/screens/SoilScreen/components/EditIntervalModalContent';
import {useMemo, useCallback} from 'react';
import {
  LabelledDepthInterval,
  ProjectDepthInterval,
  SoilData,
  SoilDataDepthInterval,
  methodEnabled,
  methodRequired,
  soilPitMethods,
  updateSoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {DataInputSummary} from 'terraso-mobile-client/components/DataInputSummary';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  pitMethodSummary,
  renderDepthInterval,
} from 'terraso-mobile-client/screens/SoilScreen/utils/renderValues';
import {
  selectDepthDependentData,
  selectSiteSoilProjectSettings,
} from 'terraso-client-shared/selectors';

export const SoilScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const soilData = useSelector(state => state.soilId.soilData[siteId]) as
    | SoilData
    | undefined;
  const project = useSelector(state => {
    const projectId = state.site.sites[siteId].projectId;
    return projectId ? state.soilId.projectSettings[projectId] : undefined;
  });

  const projectDepthIntervals = useMemo(() => {
    return project?.depthIntervals ?? [];
  }, [project]);

  const validSoilDataDepthIntervals = useMemo(() => {
    return (soilData?.depthIntervals ?? []).filter(({depthInterval: a}) =>
      projectDepthIntervals.every(
        ({depthInterval: b}) => a.end <= b.start || a.start >= b.end,
      ),
    );
  }, [projectDepthIntervals, soilData?.depthIntervals]);

  const allIntervals = useMemo<
    (ProjectDepthInterval | SoilDataDepthInterval)[]
  >(
    () =>
      [...projectDepthIntervals, ...validSoilDataDepthIntervals].sort(
        (a, b) => a.depthInterval.start - b.depthInterval.start,
      ),
    [projectDepthIntervals, validSoilDataDepthIntervals],
  );

  const existingIntervals = useMemo(
    () => allIntervals.map(interval => interval.depthInterval),
    [allIntervals],
  );

  const dispatch = useDispatch();

  const onAddDepthInterval = useCallback(
    async (interval: LabelledDepthInterval) => {
      await dispatch(updateSoilDataDepthInterval({siteId, ...interval}));
    },
    [siteId, dispatch],
  );

  return (
    <BottomSheetModalProvider>
      <ScrollView backgroundColor="grey.300">
        <Row backgroundColor="background.default" px="16px" py="12px">
          <Heading variant="h6">{t('soil.surface')}</Heading>
        </Row>
        <Box height="16px" />
        <Row backgroundColor="background.default" px="16px" py="12px">
          <Heading variant="h6">{t('soil.pit')}</Heading>
        </Row>
        {allIntervals.map(interval => (
          <DepthIntervalView
            key={`${interval.depthInterval.start}:${interval.depthInterval.end}`}
            siteId={siteId}
            depthInterval={interval}
          />
        ))}
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
      </ScrollView>
    </BottomSheetModalProvider>
  );
};

type DepthIntervalViewProps = {
  siteId: string;
  depthInterval: ProjectDepthInterval | SoilDataDepthInterval;
};

const DepthIntervalView = ({siteId, depthInterval}: DepthIntervalViewProps) => (
  <Column space="1px">
    <DepthIntervalEditor siteId={siteId} depthInterval={depthInterval} />
    <DepthDependentDataInputs siteId={siteId} depthInterval={depthInterval} />
  </Column>
);

type DepthDependentDataInputsProps = {
  siteId: string;
  depthInterval: ProjectDepthInterval | SoilDataDepthInterval;
};

const DepthDependentDataInputs = ({
  siteId,
  depthInterval,
}: DepthDependentDataInputsProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const project = useSelector(selectSiteSoilProjectSettings(siteId));
  const soilData = useSelector(
    selectDepthDependentData({siteId, depthInterval}),
  );

  const methods = useMemo(() => {
    return soilPitMethods
      .filter(
        method =>
          project?.[methodRequired(method)] ||
          (depthInterval as SoilDataDepthInterval)?.[methodEnabled(method)],
      )
      .map(method => ({
        method,
        required: project?.[methodRequired(method)] ?? false,
        onPress: () =>
          navigation.navigate(`SOIL_INPUT_${method}`, {
            siteId,
            depthInterval,
          }),
      }))
      .flatMap(method =>
        method.method === 'soilTexture'
          ? [
              method,
              {
                ...method,
                method: 'rockFragmentVolume',
              } as const,
            ]
          : [method],
      )
      .map(method => ({
        ...method,
        ...pitMethodSummary(t, soilData, method.method),
      }));
  }, [t, navigation, siteId, soilData, depthInterval, project]);

  return (
    <Column space="1px">
      {methods.map(({method, required, complete, onPress, summary}) => (
        <DataInputSummary
          key={method}
          required={required}
          complete={complete}
          label={t(`soil.collection_method.${method}`)}
          value={summary}
          onPress={onPress}
        />
      ))}
    </Column>
  );
};

type DepthIntervalEditorProps = {
  siteId: string;
  depthInterval: ProjectDepthInterval | SoilDataDepthInterval;
};

const DepthIntervalEditor = ({
  siteId,
  depthInterval,
}: DepthIntervalEditorProps) => {
  const project = useSelector(selectSiteSoilProjectSettings(siteId));

  const requiredMethods = useMemo(
    () => soilPitMethods.filter(method => project?.[methodRequired(method)]),
    [project],
  );

  return (
    <Row
      backgroundColor="primary.dark"
      justifyContent="space-between"
      px="12px"
      py="8px">
      <Heading variant="h6" color="primary.contrast">
        {renderDepthInterval(depthInterval)}
      </Heading>
      <BottomSheetModal
        trigger={onOpen => (
          <IconButton
            name="more-vert"
            _icon={{color: 'primary.contrast'}}
            onPress={onOpen}
          />
        )}>
        <EditIntervalModalContent
          siteId={siteId}
          depthInterval={depthInterval.depthInterval}
          requiredInputs={requiredMethods}
        />
      </BottomSheetModal>
    </Row>
  );
};
