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

import {Button, Row, Text} from 'native-base';
import {useTranslation} from 'react-i18next';
import RadioBlock from 'terraso-mobile-client/components/common/RadioBlock';
import {Accordion} from 'terraso-mobile-client/components/common/Accordion';
import {FormSwitch} from 'terraso-mobile-client/components/common/Form';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/components/projects/constants';
import {
  LabelledDepthInterval,
  collectionMethods,
  deleteProjectDepthInterval,
  methodRequired,
  updateProjectDepthInterval,
  updateProjectSoilSettings,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {Icon, IconButton} from 'terraso-mobile-client/components/common/Icons';
import {Modal} from 'terraso-mobile-client/components/common/Modal';
import {AddIntervalModal} from 'terraso-mobile-client/components/dataInputs/AddIntervalModal';
import {useMemo, useCallback} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScrollView} from 'react-native';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.INPUTS>;
export const ProjectInputTab = ({
  route: {
    params: {projectId},
  },
}: Props) => {
  const {t} = useTranslation();

  return (
    <ScrollView>
      <RadioBlock<'imperial' | 'metric'>
        label={t('projects.inputs.units.heading')}
        options={{
          imperial: {text: t('projects.inputs.units.imperial')},
          metric: {text: t('projects.inputs.units.metric')},
        }}
        groupProps={{
          name: 'measurement-units',
          accessibilityLabel: t('projects.inputs.units.a11yLabel'),
          defaultValue: 'imperial',
        }}
      />
      <RadioBlock<'soil-survey' | 'soil-grids'>
        label={t('projects.inputs.soil_source.heading')}
        options={{
          'soil-survey': {text: t('projects.inputs.soil_source.survey')},
          'soil-grids': {
            text: t('projects.inputs.soil_source.grids'),
          },
        }}
        groupProps={{
          name: 'information-source',
          accessibilityLabel: t('projects.inputs.soil_source.a11yLabel'),
          defaultValue: 'soil-survey',
        }}
      />
      <Accordion Head={<Text>{t('soil.pit')}</Text>}>
        <SoilPitSettings projectId={projectId} />
      </Accordion>
      <Accordion
        Head={<Text>{t('soil.project_settings.required_data_title')}</Text>}>
        <RequiredDataSettings projectId={projectId} />
      </Accordion>
    </ScrollView>
  );
};

const SoilPitSettings = ({projectId}: {projectId: string}) => {
  const {t} = useTranslation();
  const settings = useSelector(
    state => state.soilId.projectSettings[projectId],
  );
  const dispatch = useDispatch();
  const existingIntervals = useMemo(
    () => settings.depthIntervals.map(interval => interval.depthInterval),
    [settings.depthIntervals],
  );

  const onAddDepthInterval = useCallback(
    async (interval: LabelledDepthInterval) => {
      await dispatch(updateProjectDepthInterval({projectId, ...interval}));
    },
    [projectId, dispatch],
  );

  return (
    <>
      {settings.depthIntervals.map(({label, depthInterval}) => (
        <Row key={`${depthInterval.start}:${depthInterval.end}`}>
          <Text flex={1}>{label}</Text>
          <Text flex={1}>{`${depthInterval.start}-${depthInterval.end}`}</Text>
          <Row flex={1} justifyContent="flex-end">
            <IconButton
              name="close"
              onPress={() =>
                dispatch(deleteProjectDepthInterval({projectId, depthInterval}))
              }
            />
          </Row>
        </Row>
      ))}
      <Modal
        trigger={onOpen => (
          <Button
            onPress={onOpen}
            alignSelf="flex-start"
            leftIcon={<Icon name="add" />}>
            {t('soil.add_depth_label')}
          </Button>
        )}>
        <AddIntervalModal
          onSubmit={onAddDepthInterval}
          existingIntervals={existingIntervals}
        />
      </Modal>
    </>
  );
};

const RequiredDataSettings = ({projectId}: {projectId: string}) => {
  const {t} = useTranslation();
  const settings = useSelector(
    state => state.soilId.projectSettings[projectId],
  );
  const dispatch = useDispatch();

  return (
    <>
      {collectionMethods.map(method => (
        <FormSwitch
          name={methodRequired(method)}
          value={settings[methodRequired(method)]}
          onChange={value =>
            dispatch(
              updateProjectSoilSettings({
                projectId,
                [methodRequired(method)]: value,
              }),
            )
          }
          label={t(`soil.collection_method.${method}`)}
        />
      ))}
    </>
  );
};
