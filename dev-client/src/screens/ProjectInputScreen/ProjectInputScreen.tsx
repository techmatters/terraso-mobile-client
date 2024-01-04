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

import {Button, Text, Box, HStack, VStack, Fab} from 'native-base';
import {useTranslation} from 'react-i18next';
import {Accordion} from 'terraso-mobile-client/components/Accordion';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/navigation/constants';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {updateProject} from 'terraso-client-shared/project/projectSlice';
import {Icon, IconButton} from 'terraso-mobile-client/components/Icons';
import {useCallback} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScrollView} from 'react-native';
import {useInfoPress} from 'terraso-mobile-client/hooks/useInfoPress';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

import {selectProjectSettings} from 'terraso-client-shared/selectors';
import {EnsureDataPresent} from 'terraso-mobile-client/components/EnsureDataPresent';
import {SoilPitSettings} from './SoilPitSettings';
import {RequiredDataSettings} from './RequiredDataSettings';

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
