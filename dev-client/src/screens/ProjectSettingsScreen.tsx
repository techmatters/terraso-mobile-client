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

import {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet} from 'react-native';

import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScrollView} from 'native-base';

import {ProjectUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';

import DeleteButton from 'terraso-mobile-client/components/buttons/DeleteButton';
import {useNavToBottomTabsAndShowSyncError} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
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
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {EditProjectForm} from 'terraso-mobile-client/screens/CreateProjectScreen/components/ProjectForm';
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
  const [projectPurposelyDeleted, setProjectPurposelyDeleted] = useState(false);

  const onSubmit = async (values: Omit<ProjectUpdateMutationInput, 'id'>) => {
    await dispatch(updateProject({...values, id: projectId, privacy}));
  };

  const navigation = useNavigation();

  const triggerDeleteProject = useCallback(() => {
    setProjectPurposelyDeleted(true);
    dispatch(deleteProject({id: projectId}));
    navigation.pop();
  }, [dispatch, navigation, projectId]);

  const userRole = useProjectRoleContext();

  const handleMissingProject = useNavToBottomTabsAndShowSyncError();
  const requirements = useMemoizedRequirements([
    {
      data: project || projectPurposelyDeleted,
      doIfMissing: handleMissingProject,
    },
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScrollView
          backgroundColor={theme.colors.primary.contrast}
          contentContainerStyle={styles.scrollview}>
          <Column
            space={4}
            m={3}
            mb="50px"
            style={styles.column}
            alignItems="flex-start">
            <EditProjectForm
              onSubmit={onSubmit}
              name={name}
              description={description}
              userRole={userRole}
            />
            <RestrictByProjectRole role={PROJECT_MANAGER_ROLES}>
              <ConfirmModal
                title={t('projects.settings.delete_button_prompt')}
                actionName={t('projects.settings.delete_button')}
                body={t('projects.settings.delete_description')}
                handleConfirm={triggerDeleteProject}
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
      )}
    </ScreenDataRequirements>
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
