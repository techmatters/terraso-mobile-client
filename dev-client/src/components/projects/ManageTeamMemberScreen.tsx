import {Text, VStack} from 'native-base';
import {useState} from 'react';
import {User} from 'terraso-client-shared/account/accountSlice';
import {ProjectMembership} from 'terraso-client-shared/project/projectSlice';
import {useSelector} from 'terraso-mobile-client/model/store';
import {
  AppBar,
  ScreenCloseButton,
  ScreenScaffold,
} from 'terraso-mobile-client/screens/ScreenScaffold';
import {formatNames} from 'terraso-mobile-client/util';
import RadioBlock from '../common/RadioBlock';
import {useTranslation} from 'react-i18next';
import {UserRole} from 'terraso-client-shared/graphqlSchema/graphql';

type Props = {
  projectId: string;
  userId: string;
  membershipId: string;
};

type ViewProps = {
  user: User;
  membership: ProjectMembership;
};

export const ManageTeamMemberScreen = ({
  projectId,
  userId,
  membershipId,
}: Props) => {
  const {t} = useTranslation();

  const [selectedRole, setSelectedRole] = useState<UserRole>('manager');

  const project = useSelector(state => state.project.projects[projectId]);
  const user = useSelector(state => state.account.users[userId]);
  const membership = project?.memberships[membershipId];
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
    </ScreenScaffold>
  );
};
