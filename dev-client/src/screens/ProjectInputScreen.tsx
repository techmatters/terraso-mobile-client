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

import {
  Button,
  Row,
  Text,
  Box,
  HStack,
  VStack,
  Select,
  Fab,
  useTheme,
} from 'native-base';
import {useTranslation} from 'react-i18next';
import {Accordion} from 'terraso-mobile-client/components/Accordion';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/navigation/constants';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {
  LabelledDepthInterval,
  ProjectDepthInterval,
  ProjectSoilSettings,
  collectionMethods,
  deleteProjectDepthInterval,
  methodRequired,
  updateProjectDepthInterval,
  updateProjectSoilSettings,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {updateProject} from 'terraso-client-shared/project/projectSlice';
import {Icon, IconButton} from 'terraso-mobile-client/components/Icons';
import {Modal} from 'terraso-mobile-client/components/Modal';
import {AddIntervalModal} from 'terraso-mobile-client/components/AddIntervalModal';
import {useMemo, useCallback, useState, useEffect} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScrollView, Switch} from 'react-native';
import {useInfoPress} from 'terraso-mobile-client/hooks/useInfoPress';
import {DepthPresets} from 'terraso-mobile-client/constants';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  DepthInterval,
  SoilIdProjectSoilSettingsDepthIntervalPresetChoices,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {ConfirmModal} from 'terraso-mobile-client/components/ConfirmModal';
import {selectProjectSettings} from 'terraso-client-shared/selectors';
import {EnsureDataPresent} from 'terraso-mobile-client/components/EnsureDataPresent';
import {DataGridTable} from 'terraso-mobile-client/components/DataGridTable';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.INPUTS>;

export const ProjectInputScreen = ({
  route: {
    params: {projectId},
  },
}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const project = useSelector(state => state.project.projects[projectId]);
  const soilSettings = useSelector(state =>
    selectProjectSettings(state, projectId),
  );
  const dispatch = useDispatch();
  const onInfoPress = useInfoPress();

  const onEditInstructions = useCallback(() => {
    return navigation.navigate('EDIT_PROJECT_INSTRUCTIONS', {project: project});
  }, [navigation, project]);

  const onProjectPrivacyChanged = useCallback(
    (privacy: 'PRIVATE' | 'PUBLIC') =>
      dispatch(updateProject({id: project!.id, privacy})),
    [project, dispatch],
  );

  const onSave = () => {
    // Manual save button is for reassurance, all items auto-save.
    navigation.pop();
  };

  return (
    <VStack height={'full'}>
      <ScrollView>
        <Box p={4} alignItems="flex-start">
          <HStack pb={4}>
            <RadioBlock
              label={
                <HStack>
                  <Text variant="body1" bold>
                    {t('site.dashboard.privacy')}
                  </Text>
                  <IconButton
                    pt={0}
                    pb={0}
                    pl={2}
                    size="md"
                    name="info"
                    onPress={onInfoPress}
                    _icon={{color: 'action.active'}}
                  />
                </HStack>
              }
              options={{
                PUBLIC: {text: t('privacy.public.title')},
                PRIVATE: {text: t('privacy.private.title')},
              }}
              groupProps={{
                name: 'project-privacy',
                onChange: onProjectPrivacyChanged,
                value: project.privacy,
                ml: '',
              }}
            />
          </HStack>
          <Text bold fontSize={'md'}>
            {t('projects.inputs.instructions.title')}
          </Text>
          <Text fontSize={'md'}>
            {t('projects.inputs.instructions.description')}
          </Text>
          <Button
            mt={2}
            pl={4}
            pr={4}
            size="lg"
            backgroundColor="primary.main"
            shadow={5}
            onPress={onEditInstructions}>
            <HStack>
              <Icon color="primary.contrast" size={'sm'} mr={2} name={'edit'} />
              <Text color="primary.contrast" textTransform={'uppercase'}>
                {t('projects.inputs.instructions.add_label')}
              </Text>
            </HStack>
          </Button>
        </Box>
        <Accordion
          Head={
            <Text pt={3} pb={3} fontSize={'md'} color={'primary.contrast'}>
              {t('soil.pit')}
            </Text>
          }>
          <EnsureDataPresent
            data={soilSettings}
            Component={SoilPitSettings}
            props={{projectId}}
          />
        </Accordion>
        <Box height={4} />
        <Accordion
          Head={
            <Text pt={3} pb={3} fontSize={'md'} color={'primary.contrast'}>
              {t('soil.project_settings.required_data_title')}
            </Text>
          }>
          <RequiredDataSettings projectId={projectId} />
        </Accordion>
      </ScrollView>
      <Fab
        onPress={() => onSave()}
        textTransform={'uppercase'}
        label={t('general.save_fab')}
        renderInPortal={false}
      />
    </VStack>
  );
};

const SoilPitSettings = ({
  data: settings,
  projectId,
}: {
  data: ProjectSoilSettings;
  projectId: string;
}) => {
  const {t} = useTranslation();
  const [selectedPreset, setSelectedPreset] =
    useState<SoilIdProjectSoilSettingsDepthIntervalPresetChoices>(
      settings.depthIntervalPreset,
    );
  const dispatch = useDispatch();
  const existingIntervals = useMemo(
    () => settings.depthIntervals.map(interval => interval.depthInterval),
    [settings.depthIntervals],
  );

  const customizable = useMemo(
    () => settings.depthIntervalPreset === 'CUSTOM' && userCanDeleteInterval,
    [settings],
  );

  const onAddDepthInterval = useCallback(
    async (interval: LabelledDepthInterval) => {
      await dispatch(updateProjectDepthInterval({projectId, ...interval}));
    },
    [projectId, dispatch],
  );

  const onChangeDepthPreset = useCallback(() => {
    dispatch(
      updateProjectSoilSettings({
        projectId,
        depthIntervalPreset: selectedPreset,
      }),
    );
  }, [dispatch, projectId, selectedPreset]);

  const onSelectUpdated = useCallback(
    (onOpen: () => void) => (value: string) => {
      if (value === selectedPreset) {
        return;
      }
      setSelectedPreset(
        value as SoilIdProjectSoilSettingsDepthIntervalPresetChoices,
      );
      onOpen();
    },

    [selectedPreset, setSelectedPreset],
  );

  return (
    <Box p={4}>
      <Text color={'primary.main'}>
        {t('projects.inputs.depth_intervals.title')}
      </Text>
      <ConfirmModal
        trigger={onOpen => (
          <Select
            mb={5}
            width={'60%'}
            variant={'underlined'}
            selectedValue={settings.depthIntervalPreset}
            onValueChange={onSelectUpdated(onOpen)}>
            {DepthPresets.map(preset => (
              <Select.Item
                label={t(
                  `projects.inputs.depth_intervals.${preset.toLowerCase()}`,
                )}
                value={preset}
                key={preset}
              />
            ))}
          </Select>
        )}
        title={t('projects.inputs.depth_intervals.confirm_preset.title')}
        body={t('projects.inputs.depth_intervals.confirm_preset.body')}
        actionName={t('projects.inputs.depth_intervals.confirm_preset.confirm')}
        handleConfirm={onChangeDepthPreset}
      />
      <DepthIntervalTable
        depthIntervals={settings.depthIntervals}
        projectId={projectId}
        canDeleteInterval={customizable}
        includeLabel={customizable}
        pb="15px"
      />
      {customizable ? (
        <Modal
          trigger={onOpen => (
            <Button
              onPress={onOpen}
              alignSelf="flex-start"
              backgroundColor="primary.main"
              shadow={5}
              leftIcon={<Icon name="add" />}>
              {t('soil.add_depth_label')}
            </Button>
          )}>
          <AddIntervalModal
            onSubmit={onAddDepthInterval}
            existingIntervals={existingIntervals}
          />
        </Modal>
      ) : undefined}
    </Box>
  );
};

const RequiredDataSettings = ({projectId}: {projectId: string}) => {
  const {t} = useTranslation();
  const settings = useSelector(
    state => state.soilId.projectSettings[projectId],
  );
  const dispatch = useDispatch();
  const {colors} = useTheme();

  return (
    <Box p={4}>
      {collectionMethods.map(method => (
        <Row
          key={method}
          pt={2}
          pb={5}
          justifyContent="flex-start"
          alignItems="center">
          <Switch
            value={settings[methodRequired(method)]}
            thumbColor={
              settings[methodRequired(method)]
                ? colors.primary.main
                : colors.primary.contrast
            }
            onValueChange={value => {
              dispatch(
                updateProjectSoilSettings({
                  projectId,
                  [methodRequired(method)]: value,
                }),
              );
            }}
          />
          <Text bold pl={2} fontSize={'md'}>
            {t(`soil.collection_method.${method}`)}
          </Text>
        </Row>
      ))}
    </Box>
  );
};

type TableProps = {
  depthIntervals: ProjectDepthInterval[];
  projectId: string;
  includeLabel: boolean;
  canDeleteInterval: boolean;
} & Omit<React.ComponentProps<typeof DataGridTable>, 'rows' | 'headers'>;

const DepthIntervalTable = ({
  depthIntervals,
  projectId,
  canDeleteInterval,
  includeLabel,
  ...extraProps
}: TableProps) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const headers = [];
  if (includeLabel) {
    headers.push(t('projects.inputs.depth_intervals.label'));
  }
  headers.push(t('projects.inputs.depth_intervals.depth', {units: 'cm'}));
  if (canDeleteInterval) {
    headers.push('');
  }

  const deleteDepthInterval = useCallback(
    (depthInterval: DepthInterval) => () => {
      return dispatch(deleteProjectDepthInterval({projectId, depthInterval}));
    },
    [projectId, dispatch],
  );

  const rows = useMemo(() => {
    return depthIntervals.map(({label, depthInterval}) => {
      let result: (string | React.ReactElement)[] = [];
      if (includeLabel) {
        result.push(label);
      }
      result.push(
        t('soil.depth_interval.bounds', {depthInterval, units: 'cm'}),
      );
      if (canDeleteInterval) {
        result.push(
          <Box flex={1} flexDirection="row" justifyContent="flex-end">
            <IconButton
              name="close"
              onPress={deleteDepthInterval(depthInterval)}
              _icon={{
                size: 'sm',
                color: 'action.active',
              }}
            />
          </Box>,
        );
      }
      return result;
    });
  }, [depthIntervals, canDeleteInterval, includeLabel]);

  return <DataGridTable headers={headers} rows={rows} {...extraProps} />;
};
