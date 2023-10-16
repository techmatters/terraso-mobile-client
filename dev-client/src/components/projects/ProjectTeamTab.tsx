import {VStack} from 'native-base';
import AddButton from 'terraso-mobile-client/components/common/AddButton';
import UserList from 'terraso-mobile-client/components/common/UserList';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/components/projects/constants';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import {useCallback} from 'react';
import {
  ProjectMembership,
  removeMembershipFromProject,
} from 'terraso-client-shared/project/projectSlice';
import {selectProjectMembershipsWithUsers} from 'terraso-client-shared/selectors';
import {useTranslation} from 'react-i18next';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.TEAM>;

export default function ProjectTeamTab({route}: Props) {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const currentUser = useSelector(state => state.account.currentUser);
  const members = useSelector(state =>
    selectProjectMembershipsWithUsers(state, route.params.projectId),
  );

  const removeMembership = useCallback(
    (membership: ProjectMembership) => {
      return async () => {
        dispatch(
          removeMembershipFromProject({
            membershipId: membership.id,
            projectId: route.params.projectId,
          }),
        );
      };
    },
    [dispatch, route.params.projectId],
  );

  const manageMember = useCallback((userId: string, membershipId: string) => {
    return async () => {
      navigation.navigate('MANAGE_TEAM_MEMBER', {
        userId,
        membershipId,
        projectId: route.params.projectId,
      });
    };
  });

  return (
    <VStack alignItems="flex-start" p={4} space={3}>
      <AddButton
        text={t('projects.team.add')}
        buttonProps={{
          onPress: () =>
            navigation.navigate('ADD_USER_PROJECT', {
              projectId: route.params.projectId,
            }),
        }}
      />
      <UserList
        memberships={members}
        currentUserId={currentUser.data?.id}
        userAction={removeMembership}
        memberAction={manageMember}
      />
    </VStack>
  );
}
