import {VStack} from 'native-base';
import AddButton from '../common/AddButton';
import UserList from '../common/UserList';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {TabRoutes, TabStackParamList} from './constants';
import {useDispatch, useSelector} from '../../model/store';
import {useCallback, useState} from 'react';
import {
  ProjectMembership,
  removeMembershipFromProject,
} from 'terraso-client-shared/project/projectSlice';
import {useTranslation} from 'react-i18next';
import {User} from 'terraso-client-shared/account/accountSlice';
import {useNavigation} from '../../screens/AppScaffold';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.TEAM>;

export default function ProjectTeamTab({route}: Props) {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const currentUser = useSelector(state => state.account.currentUser);
  let [members, setMembers] = useState(
    route.params.memberships.reduce(
      (x, y) => ({...x, [y[0].id]: y}),
      {} as Record<string, [ProjectMembership, User]>,
    ),
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
        // TODO: This is just to get the project to update
        let newMembers = {...members};
        delete newMembers[membership.id];
        setMembers(newMembers);
      };
    },
    [dispatch, members, route.params.projectId],
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
        memberships={Object.entries(members)}
        currentUserId={currentUser.data?.id}
        userAction={removeMembership}
      />
    </VStack>
  );
}
