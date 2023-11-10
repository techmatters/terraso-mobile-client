import {Button, Row, Text, Box, HStack} from 'native-base';
import {useTranslation} from 'react-i18next';
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
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.INPUTS>;
export const ProjectInputTab = ({
  route: {
    params: {projectId},
  },
}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const project = useSelector(state => state.project.projects[projectId]);

  const onEditInstructions = useCallback(() => {
    return navigation.navigate('EDIT_PROJECT_INSTRUCTIONS', {project: project});
  }, [navigation, project]);

  return (
    <ScrollView>
      <Box p={4} alignItems="flex-start">
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
          backgroundColor="primary.dark"
          shadow={5}
          onPress={onEditInstructions}>
          <HStack>
            <Icon color="primary.contrast" size={'sm'} mr={2} name={'edit'} />
            <Text color="primary.contrast">
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
