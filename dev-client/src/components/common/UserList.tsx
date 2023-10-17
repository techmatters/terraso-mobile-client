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
import {formatName} from 'terraso-mobile-client/util';

type ListProps = {
  memberships: [ProjectMembership, User][];
  currentUserId?: string;
  userAction: (membership: ProjectMembership) => () => void;
};

type ItemProps = {
  membership: ProjectMembership;
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
    let name = formatName(user.firstName, user.lastName);

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
          <Center>
            <Button
              size="sm"
              my={2}
              w="50%"
              _text={{color: 'error.main'}}
              bgColor="grey.200"
              onPress={onPress}>
              {t('projects.team.leave_project')}
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
      renderItem={({item: [membership, user]}) => (
        <UserItem
          membership={membership}
          user={user}
          currentUserId={currentUserId}
          onPress={userAction(membership)}
        />
      )}
      keyExtractor={([membership, _]) => membership.id}
      ItemSeparatorComponent={Divider}
    />
  );
}
