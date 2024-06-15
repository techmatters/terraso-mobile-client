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

import {Button} from 'native-base';

import {SimpleUserInfo} from 'terraso-client-shared/account/accountSlice';
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
import {ScreenCloseButton} from 'terraso-mobile-client/navigation/components/ScreenCloseButton';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {MinimalUserDisplay} from 'terraso-mobile-client/screens/AddUserToProjectScreen/components/MinimalUserDisplay';
import {ProjectRoleRadioBlock} from 'terraso-mobile-client/screens/AddUserToProjectScreen/components/ProjectRoleRadioBlock';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

type Props = {
  projectId: string;
  // TODO-cknipe: Consolidate UserFields and SimpleUserInfo
  user: SimpleUserInfo;
};

export const AddUserToProjectRoleScreen = ({projectId, user}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const project = useSelector(state => state.project.projects[projectId]);

  const [selectedRole, setSelectedRole] = useState<ProjectRole>('VIEWER');

  const addUser = useCallback(async () => {
    try {
      // TODO-cknipe: Why can't you use the values directly in addUserToProject?
      // TODO-cknipe: To await or not?
      const userId = user.id;
      const role = selectedRole;
      dispatch(addUserToProject({userId, role, projectId}));
    } catch (e) {
      console.error(e);
    }
    navigation.pop();
    navigation.pop();
  }, [dispatch, projectId, user, selectedRole, navigation]);

  return (
    <ScreenScaffold
      AppBar={
        <AppBar title={project?.name} LeftButton={<ScreenCloseButton />} />
      }>
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
              onPress={addUser}
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
