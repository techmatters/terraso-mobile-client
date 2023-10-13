import {
  Badge,
  Box,
  Button,
  Center,
  Divider,
  FlatList,
  HStack,
  Image,
  Text,
  VStack,
} from 'native-base';
import {User} from 'terraso-client-shared/account/accountSlice';
import {useTranslation} from 'react-i18next';
import {useMemo} from 'react';
import {ProjectMembership} from 'terraso-client-shared/project/projectSlice';
import ConfirmModal from './ConfirmModal';

type ListProps = {
  memberships: [ProjectMembership, User][];
  currentUserId?: string;
  userAction: (membership: ProjectMembership) => () => void;
};

type ItemProps = {
  membership: ProjectMembership;
  user: User;
  currentUserId?: string;
  removeUser: () => void;
};

type TriggerProps = {
  onOpen: () => void;
  message: string;
};

function LeaveProjectTrigger({onOpen, message}: TriggerProps) {
  return (
    <Center>
      <Button
        size="sm"
        my={2}
        w="50%"
        _text={{color: 'error.main'}}
        bgColor="grey.200"
        onPress={onOpen}>
        {message}
      </Button>
    </Center>
  );
}

function UserItem({membership, user, currentUserId, removeUser}: ItemProps) {
  const {t} = useTranslation();
  const isCurrentUser = useMemo(() => {
    return user.id === currentUserId;
  }, [user, currentUserId]);

  const userName = useMemo(() => {
    let name = '';
    if (user.lastName !== '') {
      name += user.lastName;
      name += ', ';
    }
    name += user.firstName;
    if (isCurrentUser) {
      name += ` (${t('general.you')})`;
    }
    return name;
  }, [user, isCurrentUser, t]);

  return (
    <Box borderBottomWidth="1" width={275} py={2}>
      <VStack>
        <HStack space={3} justifyContent="space-between" alignItems="center">
          <Box>
            <Image
              variant="profilePic"
              source={{uri: user.profileImage}}
              alt="profile pic"
            />
          </Box>
          <Text flex={3}>{userName}</Text>
          <Box>
            <Badge
              variant="chip"
              bg="primary.lightest"
              py="5px"
              px="10px"
              _text={{color: 'text.primary'}}>
              {t('general.role.' + membership.userRole)}
            </Badge>
          </Box>
        </HStack>
        {isCurrentUser && (
          <ConfirmModal
            trigger={onOpen => (
              <LeaveProjectTrigger
                onOpen={onOpen}
                message={t('projects.team.leave_project_modal.trigger')}
              />
            )}
            title={t('projects.team.leave_project_modal.title')}
            body={t('projects.team.leave_project_modal.body')}
            actionName={t('projects.team.leave_project_modal.action_name')}
            handleConfirm={removeUser}
          />
        )}
      </VStack>
    </Box>
  );
}

export default function UserList({
  memberships,
  userAction,
  currentUserId,
}: ListProps) {
  return (
    <FlatList
      data={memberships}
      renderItem={({item: [membership, user]}) => (
        <UserItem
          membership={membership}
          user={user}
          currentUserId={currentUserId}
          removeUser={userAction(membership)}
        />
      )}
      keyExtractor={([membership, _]) => membership.id}
      ItemSeparatorComponent={Divider}
    />
  );
}
