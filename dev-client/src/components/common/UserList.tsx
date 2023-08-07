import {
  Badge,
  Box,
  Button,
  Center,
  FlatList,
  HStack,
  Image,
  Text,
  VStack,
} from 'native-base';
import {Membership} from 'terraso-client-shared/memberships/membershipsSlice';
import {User} from 'terraso-client-shared/account/accountSlice';
import {useTranslation} from 'react-i18next';
import {useMemo} from 'react';

type ListProps = {
  memberships: [string, [Membership, User]][];
  currentUserId?: string;
  userAction: (membership: Membership) => () => void;
};

type ItemProps = {
  membership: Membership;
  user: User;
  currentUserId?: string;
  onPress?: () => void;
};

function UserItem({membership, user, currentUserId, onPress}: ItemProps) {
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
              size={50}
              borderRadius={100}
              source={{uri: user.profileImage}}
              alt="profile pic"
            />
          </Box>
          <Text flex={3}>{userName}</Text>
          <Box>
            <Badge
              bg="primary.lightest"
              _text={{color: 'text.primary'}}
              borderRadius={14}
              flex={0}
              ml={6}>
              {membership.userRole.charAt(0) +
                membership.userRole.slice(1).toLowerCase()}
            </Badge>
          </Box>
        </HStack>
        {isCurrentUser && (
          <Center>
            <Button
              size="sm"
              my={2}
              width="50%"
              _text={{color: 'error.main'}}
              bgColor="grey.200"
              onPress={onPress}>
              LEAVE PROJECT
            </Button>
          </Center>
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
      renderItem={({item: [_, [membership, user]]}) => (
        <UserItem
          membership={membership}
          user={user}
          currentUserId={currentUserId}
          onPress={userAction(membership)}
        />
      )}
      keyExtractor={([id, _]) => id}
    />
  );
}
