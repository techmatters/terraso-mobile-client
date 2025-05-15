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

import {useCallback, useContext} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet} from 'react-native';
import {Divider} from 'react-native-paper';

import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScrollView} from 'native-base';

import {ProjectUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';

import {DeleteButton} from 'terraso-mobile-client/components/buttons/common/DeleteButton';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByProjectRole} from 'terraso-mobile-client/components/restrictions/RestrictByRole';
import {useProjectRoleContext} from 'terraso-mobile-client/context/ProjectRoleContext';
import {PROJECT_MANAGER_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {updateProject} from 'terraso-mobile-client/model/project/projectGlobalReducer';
import {deleteProject} from 'terraso-mobile-client/model/project/projectSlice';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/navigation/constants';
import {EditProjectForm} from 'terraso-mobile-client/screens/CreateProjectScreen/components/ProjectForm';
import {ProjectDeletionContext} from 'terraso-mobile-client/screens/ProjectViewScreen/ProjectDeletionContext';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectProject} from 'terraso-mobile-client/store/selectors';
import {theme} from 'terraso-mobile-client/theme';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.SETTINGS>;

export function ProjectSettingsScreen({
  route: {
    params: {projectId},
  },
}: Props) {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const project = useSelector(selectProject(projectId));
  const {name, description, privacy} = project;

  const onSubmit = async (values: Omit<ProjectUpdateMutationInput, 'id'>) => {
    await dispatch(updateProject({...values, id: projectId, privacy}));
  };

  const setProjectPurposelyDeleted = useContext(ProjectDeletionContext);
  const onDeleteProject = useCallback(async () => {
    setProjectPurposelyDeleted(true);
    await dispatch(deleteProject({id: projectId}));
  }, [setProjectPurposelyDeleted, dispatch, projectId]);

  const userRole = useProjectRoleContext();

  return (
    <ScrollView
      backgroundColor={theme.colors.primary.contrast}
      contentContainerStyle={styles.scrollview}>
      <Column space={4} m={3} style={styles.column}>
        <EditProjectForm
          onSubmit={onSubmit}
          name={name}
          description={description}
          userRole={userRole}
        />
        <Divider />
        <RestrictByProjectRole role={PROJECT_MANAGER_ROLES}>
          <ConfirmModal
            title={t('projects.settings.delete_button_prompt')}
            actionLabel={t('projects.settings.delete_button')}
            body={t('projects.settings.delete_description', {
              projectName: project.name,
            })}
            handleConfirm={onDeleteProject}
            trigger={onOpen => (
              <DeleteButton
                label={t('projects.settings.delete')}
                onPress={onOpen}
              />
            )}
          />
        </RestrictByProjectRole>
      </Column>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollview: {
    flexGrow: 1,
  },
  column: {
    flex: 1,
  },
});
