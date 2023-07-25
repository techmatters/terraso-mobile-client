import {VStack} from 'native-base';
import AddButton from '../common/AddButton';
import UserList from '../common/UserList';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {TabRoutes, TabStackParamList} from './constants';
import {useDispatch, useSelector} from '../../model/store';
import {useCallback} from 'react';
import {
  Membership,
  removeMember,
} from 'terraso-client-shared/memberships/membershipsSlice';
import {useTranslation} from 'react-i18next';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.TEAM>;

export default function ProjectTeamTab({route}: Props) {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.account.currentUser);
  const removeUserFromProject = useCallback(
    (membership: Membership, userId: string) => {
      return () => {
        dispatch(removeMember(membership));
      };
    },
    [],
  );

  return (
    <VStack alignItems="flex-start" p={4} space={3}>
      <AddButton text={t('projects.team.add')} />
      <UserList
        memberships={Object.entries(route.params.memberships)}
        currentUserId={currentUser.data?.id}
        userAction={removeUserFromProject}
      />
    </VStack>
  );
}
