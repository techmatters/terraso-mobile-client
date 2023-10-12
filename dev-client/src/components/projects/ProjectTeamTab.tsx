import {VStack} from 'native-base';
import AddButton from '../common/AddButton';
import UserList from '../common/UserList';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {TabRoutes, TabStackParamList} from './constants';
import {useDispatch, useSelector} from '../../model/store';
import {useCallback} from 'react';
import {
  ProjectMembership,
  removeMembershipFromProject,
} from 'terraso-client-shared/project/projectSlice';
import {selectProjectMembershipsWithUsers} from 'terraso-client-shared/selectors';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '../../screens/AppScaffold';

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
      />
    </VStack>
  );
}
