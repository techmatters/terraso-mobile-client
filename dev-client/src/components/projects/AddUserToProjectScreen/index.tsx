import {Fab} from 'native-base';
import {FreeformTextInput} from '../../common/FreeformTextInput';
import {useTranslation} from 'react-i18next';
import {AppBar, ScreenScaffold} from '../../../screens/ScreenScaffold';
import {useCallback, useMemo, useState} from 'react';
import {UserRole} from 'terraso-client-shared/graphqlSchema/graphql';
import {checkUserInProject} from 'terraso-client-shared/account/accountService';
import MembershipControlList, {UserWithRole} from './MembershipControlList';
import {addUserToProject} from 'terraso-client-shared/project/projectSlice';
import {useNavigation} from '../../../screens/AppScaffold';
import {useDispatch, useSelector} from '../../../model/store';

type Props = {
  projectId: string;
};

export const AddUserToProjectScreen = ({projectId}: Props) => {
  const {t} = useTranslation();
  const [userRecord, setUserRecord] = useState<Record<string, UserWithRole>>(
    {},
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const projectName = useSelector(
    state => state.project.projects[projectId]?.name,
  );

  const userList = useMemo(() => Object.values(userRecord), [userRecord]);

  const validationFunc = async (email: string) => {
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
      <FreeformTextInput
        validationFunc={validationFunc}
        placeholder={t('general.example_email')}
      />
      <MembershipControlList
        users={userList}
        updateUserRole={updateUserRole}
        removeUser={removeUser}
      />
      <Fab
        label={t('general.save_fab')}
        onPress={submitUsers}
        disabled={isSubmitting}
        renderInPortal={false}
      />
    </ScreenScaffold>
  );
};
