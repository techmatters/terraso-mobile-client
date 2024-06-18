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

import {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {TabActions} from '@react-navigation/native';
import {Button} from 'native-base';

import {
  addUserToProject,
  ProjectRole,
} from 'terraso-client-shared/project/projectSlice';

import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {
  Box,
  Column,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {TabRoutes} from 'terraso-mobile-client/navigation/constants';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {MinimalUserDisplay} from 'terraso-mobile-client/screens/AddUserToProjectScreen/components/MinimalUserDisplay';
import {ProjectRoleRadioBlock} from 'terraso-mobile-client/screens/AddUserToProjectScreen/components/ProjectRoleRadioBlock';
import {UserFields} from 'terraso-mobile-client/screens/AddUserToProjectScreen/components/UserDisplay';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

type Props = {
  projectId: string;
  user: UserFields;
};

export const AddUserToProjectRoleScreen = ({projectId, user}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const project = useSelector(state => state.project.projects[projectId]);

  const [selectedRole, setSelectedRole] = useState<ProjectRole>('VIEWER');

  const onCancel = useCallback(() => {
    navigation.pop();
  }, [navigation]);

  const addUser = useCallback(async () => {
    try {
      dispatch(
        addUserToProject({userId: user.id, role: selectedRole, projectId}),
      );
    } catch (e) {
      console.error(e);
    }
    navigation.navigate('PROJECT_VIEW', {projectId: projectId});
    navigation.dispatch(TabActions.jumpTo(TabRoutes.TEAM));
  }, [dispatch, projectId, user, selectedRole, navigation]);

  return (
    <ScreenScaffold AppBar={<AppBar title={project?.name} />}>
      <ScreenContentSection title={t('projects.add_user.heading')}>
        <Column>
          <Box ml="md" my="lg">
            <MinimalUserDisplay user={user} />
          </Box>

          <ProjectRoleRadioBlock
            onChange={setSelectedRole}
            selectedRole={selectedRole}
          />

          <Row
            flex={0}
            justifyContent="flex-end"
            alignItems="center"
            space="12px"
            pt="md">
            <Button
              onPress={onCancel}
              size="lg"
              variant="outline"
              borderColor="action.active"
              _text={{textTransform: 'uppercase', color: 'action.active'}}>
              {t('general.cancel')}
            </Button>
            {/* FYI: The 1px border is to visually match the size of the outline
            variant, which appears to be 1px bigger than the solid variant due
            to its border. */}
            <Button
              borderWidth="1px"
              borderColor="primary.main"
              onPress={addUser}
              size="lg"
              variant="solid"
              _text={{textTransform: 'uppercase'}}>
              {t('general.add')}
            </Button>
          </Row>
        </Column>
      </ScreenContentSection>
    </ScreenScaffold>
  );
};
