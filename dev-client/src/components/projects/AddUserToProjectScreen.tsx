import {ScrollView} from 'native-base';
import {FreeformTextInput} from '../common/FreeformTextInput';
import {useTranslation} from 'react-i18next';
import {ScreenScaffold} from '../../screens/ScreenScaffold';
import {useCallback, useState} from 'react';
import {UserRole} from 'terraso-client-shared/graphqlSchema/graphql';
import {User} from 'terraso-client-shared/account/accountSlice';
import {checkUserInProject} from 'terraso-client-shared/account/accountService';

type Props = {
  projectId: string;
};

type UserWithRole = {user: Omit<User, 'preferences'>; role: UserRole};

export const AddUserToProjectScreen = ({projectId}: Props) => {
  const {t} = useTranslation();
  const [userRecord, setUserRecord] = useState<Record<string, UserWithRole>>(
    {},
  );

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

  return (
    <ScreenScaffold>
      <ScrollView>
        <FreeformTextInput
          validationFunc={validationFunc}
          placeholder={t('general.example_email')}
        />
      </ScrollView>
    </ScreenScaffold>
  );
};
