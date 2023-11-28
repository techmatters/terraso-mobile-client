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

import {Box, Button, HStack, Text} from 'native-base';
import {FreeformTextInput} from 'terraso-mobile-client/components/common/FreeformTextInput';
import {useTranslation} from 'react-i18next';
import {
  AppBar,
  ScreenScaffold,
} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useCallback, useMemo, useState} from 'react';
import {UserRole} from 'terraso-client-shared/graphqlSchema/graphql';
import {checkUserInProject} from 'terraso-client-shared/account/accountService';
import MembershipControlList, {
  UserWithRole,
} from 'terraso-mobile-client/components/projects/AddUserToProjectScreen/MembershipControlList';
import {addUserToProject} from 'terraso-client-shared/project/projectSlice';
import {useNavigation} from 'terraso-mobile-client/screens/useNavigation';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import {useKeyboardOpen} from 'terraso-mobile-client/hooks/index.hooks';

type Props = {
  projectId: string;
};

export const AddUserToProjectScreen = ({projectId}: Props) => {
  const {t} = useTranslation();
  const [userRecord, setUserRecord] = useState<Record<string, UserWithRole>>(
    {},
  );
  const keyboardOpen = useKeyboardOpen();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const projectName = useSelector(
    state => state.project.projects[projectId]?.name,
  );

  const userList = useMemo(() => Object.values(userRecord), [userRecord]);
  const disableSubmit = useMemo(
    () => isSubmitting || Object.keys(userRecord).length === 0,
    [userRecord, isSubmitting],
  );

  const validationFunc = async (email: string) => {
    if (email === '') {
      // TODO: current bug means empty string for email is considered existing :(
      // Easier just to explicitly reject it here
      return t('projects.add_user.empty_email');
    }
    const userExists = await checkUserInProject(projectId, email);
    if ('type' in userExists) {
      switch (userExists.type) {
        case 'NoUser':
          return t('projects.add_user.user_does_not_exist', {email: email});
        case 'InProject':
          return t('projects.add_user.user_in_project', {email: email});
      }
    }
    if (userExists.id in userRecord) {
      return t('projects.add_user.already_added', {email: email});
    }

    setUserRecord(users => {
      return {
        ...users,
        [userExists.id]: {user: userExists, role: 'viewer'},
      };
    });
    return null;
  };

  const updateUserRole = useCallback((role: UserRole, userId: string) => {
    setUserRecord(users => {
      const newUsers = {...users};
      newUsers[userId].role = role;
      return newUsers;
    });
  }, []);

  const removeUser = useCallback((userId: string) => {
    setUserRecord(users => {
      let newUsers = {...users};
      delete newUsers[userId];
      return newUsers;
    });
  }, []);

  const submitUsers = async () => {
    setIsSubmitting(true);
    for (const {
      user: {id: userId},
      role,
    } of Object.values(userRecord)) {
      try {
        dispatch(addUserToProject({userId, role, projectId}));
      } catch (e) {
        console.error(e);
      }
    }
    navigation.pop();
    setIsSubmitting(false);
  };

  return (
    <ScreenScaffold AppBar={<AppBar title={projectName} />}>
      <Box mx="5%" mb="15px" mt="22px">
        <Text variant="body1" fontWeight="bold">
          {t('projects.add_user.heading')}
        </Text>
        <Text variant="body1">{t('projects.add_user.help_text')}</Text>
      </Box>
      <Box mx="5%" mb="15px">
        <FreeformTextInput
          validationFunc={validationFunc}
          placeholder={t('general.example_email')}
          inputProps={{
            autoComplete: 'email',
            autoCapitalize: 'none',
            keyboardType: 'email-address',
          }}
        />
      </Box>
      <MembershipControlList
        users={userList}
        updateUserRole={updateUserRole}
        removeUser={removeUser}
      />
      <HStack
        flexDirection="row-reverse"
        my="20px"
        ml="20px"
        display={keyboardOpen ? 'none' : undefined}>
        <Button
          onPress={submitUsers}
          isDisabled={disableSubmit}
          isLoading={isSubmitting}
          w="100px">
          {t('general.save_fab')}
        </Button>
      </HStack>
    </ScreenScaffold>
  );
};
