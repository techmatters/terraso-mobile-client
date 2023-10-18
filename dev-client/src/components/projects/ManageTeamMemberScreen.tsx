import {
  Box,
  Button,
  Divider,
  HStack,
  ScrollView,
  Text,
  VStack,
} from 'native-base';
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
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';

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
  const navigation = useNavigation();

  const project = useSelector(state => state.project.projects[projectId]);
  const user = useSelector(state => state.account.users[userId]);
  const membership = project?.memberships[membershipId];

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    membership ? membership.userRole : 'manager',
  );

  const removeMembership = useCallback(async () => {
    await dispatch(
      removeMembershipFromProject({
        membershipId,
        projectId,
      }),
    );
    navigation.pop();
  }, [dispatch, projectId, membershipId]);

  const updateUser = useCallback(async () => {
    await dispatch(updateUserRole({projectId, userId, newRole: selectedRole}));
    navigation.pop();
  }, [dispatch, projectId, userId, selectedRole]);

  return (
    <ScreenScaffold
      AppBar={
        <AppBar title={project?.name} LeftButton={<ScreenCloseButton />} />
      }>
      <VStack mx="14px">
        <VStack mt="22px" mb="15px">
          <Text variant="body1" fontWeight={700}>
            {formatNames(user.firstName, user.lastName)}
          </Text>
          <Text numberOfLines={1} variant="body1">
            {user.email}
          </Text>
        </VStack>
        <RadioBlock<UserRole>
          labelProps={{variant: 'secondary'}}
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

        <Divider my="20px" width="90%" alignSelf="center" />

        <VStack>
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
          <Text ml="20px" variant="caption">
            {t('projects.manage_member.remove_help')}
          </Text>
        </VStack>

        <Box flex={0} height="15%" justifyContent="flex-end">
          <Button onPress={updateUser} alignSelf="flex-end">
            {t('general.save_fab')}
          </Button>
        </Box>
      </VStack>
    </ScreenScaffold>
  );
};
