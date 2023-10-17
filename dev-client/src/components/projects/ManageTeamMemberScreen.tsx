import {Button, Divider, Text, VStack} from 'native-base';
import {useCallback, useState} from 'react';
import {User} from 'terraso-client-shared/account/accountSlice';
import {
  ProjectMembership,
  removeMembershipFromProject,
  updateUserRole,
} from 'terraso-client-shared/project/projectSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import {
  AppBar,
  ScreenCloseButton,
  ScreenScaffold,
} from 'terraso-mobile-client/screens/ScreenScaffold';
import {formatNames} from 'terraso-mobile-client/util';
import RadioBlock from 'terraso-mobile-client/components/common/RadioBlock';
import {useTranslation} from 'react-i18next';
import {UserRole} from 'terraso-client-shared/graphqlSchema/graphql';
import {Icon} from 'terraso-mobile-client/components/common/Icons';
import ConfirmModal from '../common/ConfirmModal';

type Props = {
  projectId: string;
  userId: string;
  membershipId: string;
};

export const ManageTeamMemberScreen = ({
  projectId,
  userId,
  membershipId,
}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();

  const project = useSelector(state => state.project.projects[projectId]);
  const user = useSelector(state => state.account.users[userId]);
  const membership = project?.memberships[membershipId];

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    membership.userRole,
  );

  const removeMembership = useCallback(() => {
    dispatch(
      removeMembershipFromProject({
        membershipId,
        projectId,
      }),
    );
  }, [dispatch, projectId, membershipId]);

  const updateUser = useCallback(() => {
    dispatch(updateUserRole({projectId, userId, newRole: selectedRole}));
  }, [dispatch, projectId, userId, selectedRole]);

  return (
    <ScreenScaffold
      AppBar={
        <AppBar title={project?.name} LeftButton={<ScreenCloseButton />} />
      }>
      <VStack>
        <Text>{formatNames(user.firstName, user.lastName)}</Text>
        <Text numberOfLines={1}>{user.email}</Text>
      </VStack>
      <RadioBlock<UserRole>
        label={t('projects.manage_member.project_role')}
        options={{
          manager: {
            text: t('general.role.manager'),
            helpText: t('projects.manage_member.manager_help'),
          },
          contributor: {
            text: t('general.role.contributor'),
            helpText: t('projects.manage_member.contributor_help'),
          },
          viewer: {
            text: t('general.role.viewer'),
            helpText: t('projects.manage_member.viewer_help'),
          },
        }}
        groupProps={{
          onChange: setSelectedRole,
          value: selectedRole,
          name: 'selected-role',
        }}
      />

      <Divider my="25px" width="80%" />

      <VStack mx="20px">
        <ConfirmModal
          trigger={onOpen => (
            <Button
              size="sm"
              variant="ghost"
              alignSelf="start"
              width="70%"
              onPress={onOpen}
              _text={{color: 'error.main'}}
              _pressed={{backgroundColor: 'red.100'}}
              leftIcon={<Icon name="delete" color="error.main" />}>
              {t('projects.manage_member.remove').toLocaleUpperCase()}
            </Button>
          )}
          title={t('projects.manage_member.confirm_removal_title')}
          body={t('projects.manage_member.confirm_removal_body')}
          actionName={t('projects.manage_member.confirm_removal_action')}
          handleConfirm={removeMembership}
        />
        <Text ml="14px" variant="caption">
          {t('projects.manage_member.remove_help')}
        </Text>
      </VStack>

      <Button onPress={updateUser}>{t('general.save_fab')}</Button>
    </ScreenScaffold>
  );
};
