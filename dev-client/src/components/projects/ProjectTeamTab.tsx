import {VStack} from 'native-base';
import AddButton from '../common/AddButton';
import UserList from '../common/UserList';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {TabRoutes, TabStackParamList} from './constants';
import {useDispatch, useSelector} from '../../model/store';
import {useCallback, useState} from 'react';
import {
  Membership,
  removeMember,
} from 'terraso-client-shared/memberships/membershipsSlice';
import {removeUserFromProject} from 'terraso-client-shared/project/projectSlice';
import {useTranslation} from 'react-i18next';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.TEAM>;

export default function ProjectTeamTab({route}: Props) {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.account.currentUser);
  const projects = useSelector(state => state.project.projects);
  const project = projects[route.params.projectId];
  let [members, setMembers] = useState(Object.entries(project.members));

  const removeMembership = useCallback(
    (membership: Membership, userId: string) => {
      return async () => {
        await dispatch(removeMember(membership));
        dispatch(
          removeUserFromProject({userId, projectId: route.params.projectId}),
        );
        // TODO: This is just to get the project to update
        let newMembers = {...project.members};
        delete newMembers[membership.membershipId];
        setMembers(Object.entries(newMembers));
      };
    },
    [dispatch, project.members, route.params.projectId],
  );

  return (
    <VStack alignItems="flex-start" p={4} space={3}>
      <AddButton text={t('projects.team.add')} />
      <UserList
        memberships={members}
        currentUserId={currentUser.data?.id}
        userAction={removeMembership}
      />
    </VStack>
  );
}
