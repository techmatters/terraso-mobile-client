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
import {ScrollView} from 'react-native';

import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Fab} from 'native-base';

import {updateProject} from 'terraso-client-shared/project/projectSlice';

import {Accordion} from 'terraso-mobile-client/components/Accordion';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {RestrictByProjectRole} from 'terraso-mobile-client/components/RestrictByRole';
import {DataPrivacyInfoSheetButton} from 'terraso-mobile-client/components/sheets/privacy/DataPrivacyInfoSheetButton';
import {useProjectRoleContext} from 'terraso-mobile-client/context/ProjectRoleContext';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/navigation/constants';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {RequiredDataSettings} from 'terraso-mobile-client/screens/ProjectInputScreen/RequiredDataSettings';
import {SoilPitSettings} from 'terraso-mobile-client/screens/ProjectInputScreen/SoilPitSettings';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

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

  const userRole = useProjectRoleContext();

  const allowEditing = useMemo(() => userRole === 'MANAGER', [userRole]);

  return (
    <Column height="full" backgroundColor="background.default">
      <ScrollView>
        <Box p={4} alignItems="flex-start">
          <Row pb={4}>
            <RadioBlock
              label={
                <Row>
                  <Text variant="body1" bold>
                    {t('site.dashboard.privacy')}
                  </Text>
                  <DataPrivacyInfoSheetButton />
                </Row>
              }
              options={{
                PUBLIC: {text: t('privacy.public.title')},
                PRIVATE: {text: t('privacy.private.title')},
              }}
              groupProps={{
                name: 'project-privacy',
                onChange: onProjectPrivacyChanged,
                value: project?.privacy,
                ml: '0',
              }}
              allDisabled={!allowEditing}
            />
          </Row>
          <RestrictByProjectRole role="MANAGER">
            <Text bold>{t('projects.inputs.instructions.title')}</Text>
            <Text>{t('projects.inputs.instructions.description')}</Text>
            <Button
              mt={2}
              pl={4}
              pr={4}
              size="lg"
              shadow={5}
              onPress={onEditInstructions}
              leftIcon={<Icon name="push-pin" />}>
              {t('projects.inputs.instructions.add_label')}
            </Button>
          </RestrictByProjectRole>
        </Box>
        <Accordion
          initiallyOpen={true}
          Head={
            <Text pt={3} pb={3} fontSize="md" color="primary.contrast">
              {t('soil.pit')}
            </Text>
          }>
          <SoilPitSettings projectId={projectId} />
        </Accordion>
        <Box height={4} />
        <Accordion
          initiallyOpen={true}
          Head={
            <Text pt={3} pb={3} fontSize="md" color="primary.contrast">
              {t('soil.project_settings.required_data_title')}
            </Text>
          }>
          <RequiredDataSettings projectId={projectId} enabled={allowEditing} />
        </Accordion>
      </ScrollView>
      <RestrictByProjectRole role="MANAGER">
        <Fab
          onPress={() => onSave()}
          textTransform="uppercase"
          label={t('general.save_fab')}
          renderInPortal={false}
        />
      </RestrictByProjectRole>
    </Column>
  );
};
