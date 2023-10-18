import {
  Badge,
  Box,
  Button,
  Center,
  Divider,
  FlatList,
  HStack,
  Image,
  Pressable,
  Text,
  VStack,
} from 'native-base';
import {User} from 'terraso-client-shared/account/accountSlice';
import {useTranslation} from 'react-i18next';
import {useMemo} from 'react';
import {ProjectMembership} from 'terraso-client-shared/project/projectSlice';
import ConfirmModal from 'terraso-mobile-client/components/common/ConfirmModal';

type ListProps = {
  memberships: [ProjectMembership, User][];
  currentUserId?: string;
  userAction: (membership: ProjectMembership) => () => void;
  memberAction: (userId: string, memberId: string) => () => void;
};

type ItemProps = {
  membership: ProjectMembership;
  user: User;
  currentUserId?: string;
  removeUser: () => void;
  memberAction: () => void;
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

const UserWrapper = ({
  isCurrentUser,
  memberAction,
  children,
}: React.PropsWithChildren &
  Pick<ItemProps, 'memberAction'> & {isCurrentUser: boolean}) =>
  isCurrentUser ? (
    <>{children}</>
  ) : (
    <Pressable onPress={memberAction}>{children}</Pressable>
  );

function UserItem({
  membership,
  user,
  currentUserId,
  removeUser,
  memberAction,
}: ItemProps) {
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
        <UserWrapper isCurrentUser={isCurrentUser} memberAction={memberAction}>
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
        </UserWrapper>
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
  memberAction,
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
          memberAction={memberAction(user.id, membership.id)}
        />
      )}
      keyExtractor={([membership, _]) => membership.id}
      ItemSeparatorComponent={Divider}
    />
  );
}
