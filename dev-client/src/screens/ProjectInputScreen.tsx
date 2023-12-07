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
import {useMemo, useCallback} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScrollView, Switch} from 'react-native';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {useInfoPress} from 'terraso-mobile-client/hooks/useInfoPress';
import {DepthPresets} from 'terraso-mobile-client/constants';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.INPUTS>;

export const ProjectInputScreen = ({
  route: {
    params: {projectId},
  },
}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const project = useSelector(state => state.project.projects[projectId]);
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
          <SoilPitSettings projectId={projectId} />
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

  const onChangeDepthPreset = (value: string) => {
    // TODO: need to add/change project depth intervals based on selected value
    console.log(value);
  };

  return (
    <Box p={4}>
      <Text color={'primary.main'}>
        {t('projects.inputs.depth_intervals.title')}
      </Text>
      <Select
        mb={5}
        width={'60%'}
        variant={'underlined'}
        selectedValue={DepthPresets[0]}
        onValueChange={value => onChangeDepthPreset(value)}>
        {DepthPresets.map(preset => (
          <Select.Item
            label={t(`projects.inputs.depth_intervals.${preset}`)}
            value={preset}
            key={preset}
          />
        ))}
      </Select>
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
