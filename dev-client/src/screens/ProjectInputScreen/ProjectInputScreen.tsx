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

import {Accordion} from 'terraso-mobile-client/components/Accordion';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {HelpContentSpacer} from 'terraso-mobile-client/components/content/HelpContentSpacer';
import {DataPrivacyInfoButton} from 'terraso-mobile-client/components/content/info/privacy/DataPrivacyInfoButton';
import {useNavToBottomTabsAndShowSyncError} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {RestrictByProjectRole} from 'terraso-mobile-client/components/restrictions/RestrictByRole';
import {useProjectRoleContext} from 'terraso-mobile-client/context/ProjectRoleContext';
import {PROJECT_MANAGER_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {updateProject} from 'terraso-mobile-client/model/project/projectGlobalReducer';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/navigation/constants';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {RequiredDataSettings} from 'terraso-mobile-client/screens/ProjectInputScreen/RequiredDataSettings';
import {SoilPitSettings} from 'terraso-mobile-client/screens/ProjectInputScreen/SoilPitSettings';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectProject} from 'terraso-mobile-client/store/selectors';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.INPUTS>;

export const ProjectInputScreen = ({
  route: {
    params: {projectId},
  },
}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const project = useSelector(selectProject(projectId));
  const dispatch = useDispatch();

  const onEditPinnedNote = useCallback(() => {
    return navigation.navigate('EDIT_PINNED_NOTE', {
      projectId: project.id,
    });
  }, [navigation, project]);

  const onProjectPrivacyChanged = useCallback(
    (privacy: 'PRIVATE' | 'PUBLIC') =>
      dispatch(updateProject({id: project!.id, privacy})),
    [project, dispatch],
  );

  const userRole = useProjectRoleContext();

  const allowEditing = useMemo(() => userRole === 'MANAGER', [userRole]);

  const handleMissingProject = useNavToBottomTabsAndShowSyncError();
  const requirements = useMemoizedRequirements([
    {data: project, doIfMissing: handleMissingProject},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <Column height="full" backgroundColor="background.default">
          <ScrollView>
            <Box p={4} alignItems="flex-start">
              <Row pb={4}>
                <RadioBlock
                  label={
                    <Row alignItems="center">
                      <Text variant="body1" bold>
                        {t('site.dashboard.privacy')}
                      </Text>
                      <HelpContentSpacer />
                      <DataPrivacyInfoButton />
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
                    variant: 'oneLine',
                  }}
                  allDisabled={!allowEditing}
                />
              </Row>
              <RestrictByProjectRole role={PROJECT_MANAGER_ROLES}>
                <Text bold>{t('projects.inputs.instructions.title')}</Text>
                <Text mb={2}>
                  {t('projects.inputs.instructions.description')}
                </Text>
                <ContainedButton
                  onPress={onEditPinnedNote}
                  leftIcon="push-pin"
                  label={t('projects.inputs.instructions.add_label')}
                />
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
              <RequiredDataSettings
                projectId={projectId}
                enabled={allowEditing}
              />
            </Accordion>
          </ScrollView>
        </Column>
      )}
    </ScreenDataRequirements>
  );
};
