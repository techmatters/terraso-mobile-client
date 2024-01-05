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

import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScrollView, Text, VStack} from 'native-base';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/navigation/constants';
import {useTranslation} from 'react-i18next';
import IconLink from 'terraso-mobile-client/components/IconLink';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {
  deleteProject,
  updateProject,
} from 'terraso-client-shared/project/projectSlice';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {EditForm} from 'terraso-mobile-client/screens/CreateProjectScreen/components/Form';
import {ProjectUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {RestrictByProjectRole} from 'terraso-mobile-client/components/RestrictByRole';
import {ConfirmModal} from 'terraso-mobile-client/components/ConfirmModal';
import {useProjectRoleContext} from 'terraso-mobile-client/context/ProjectRoleContext';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.SETTINGS>;

export function ProjectSettingsScreen({
  route: {
    params: {downloadLink, projectId},
  },
}: Props) {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const {name, description, privacy, measurementUnits} = useSelector(
    state => state.project.projects[projectId],
  );

  const onSubmit = async (values: Omit<ProjectUpdateMutationInput, 'id'>) => {
    await dispatch(updateProject({...values, id: projectId, privacy}));
  };

  const navigation = useNavigation();

  const triggerDeleteProject = () => {
    dispatch(deleteProject({id: projectId}));
    navigation.navigate('PROJECT_LIST');
  };

  const userRole = useProjectRoleContext();

  return (
    <ScrollView>
      <VStack px={2} py={4} space={2} m={3} pb="50px">
        <EditForm
          onSubmit={onSubmit}
          name={name}
          description={description}
          measurementUnits={measurementUnits}
          submitProps={{
            right: 0,
            bottom: 0,
            label: t('general.save'),
            display: userRole === 'manager' ? 'flex' : 'none',
          }}
        />
        <VStack space={1}>
          <IconLink
            iconName="content-copy"
            isUnderlined={false}
            href={downloadLink}>
            {t('projects.settings.copy_download_link').toUpperCase()}
          </IconLink>
          <Text ml={10}>
            {t('projects.settings.download_link_description')}
          </Text>

          <RestrictByProjectRole role="manager">
            <ConfirmModal
              title={t('projects.settings.delete_button_prompt')}
              actionName={t('projects.settings.delete_button')}
              body={t('projects.settings.delete_description')}
              handleConfirm={triggerDeleteProject}
              trigger={onOpen => (
                <IconLink
                  iconName="delete-forever"
                  underlined={false}
                  onPress={onOpen}
                  color="error.main"
                  textTransform="uppercase">
                  {t('projects.settings.delete')}
                </IconLink>
              )}
            />
          </RestrictByProjectRole>
        </VStack>
      </VStack>
    </ScrollView>
  );
}
