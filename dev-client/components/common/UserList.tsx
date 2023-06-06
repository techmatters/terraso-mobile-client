import {Badge, Box, Button, FlatList, HStack, Icon, Text} from 'native-base';
import {UserProfile} from '../../types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type ListProps = {
  users: UserProfile[];
};

type ItemProps = {
  user: UserProfile;
};

function UserItem({user}: ItemProps) {
  return (
    <Box borderBottomWidth="1" width={275} py={2}>
      <HStack justifyContent="space-between" alignItems="center">
        <Box flexBasis="33%">
          <Icon
            as={MaterialCommunityIcons}
            name="account-cog"
            color="action.active"
            size="md"
          />
        </Box>
        <Text flexBasis="33%">
          {user.lastName}
          {user.lastName && ', '}
          {user.firstName}
        </Text>
        <Box flexBasis="33%">
          {user.role === 'manager' && (
            <Badge
              bg="primary.lightest"
              _text={{color: 'text.primary'}}
              borderRadius={14}
              flex={0}
              // TODO: Surely there is a better way to set the size of the chip
              ml={6}>
              Manager
            </Badge>
          )}
        </Box>
      </HStack>
    </Box>
  );
}

export default function UserList({users}: ListProps) {
  return (
    <FlatList
      data={users}
      renderItem={({item}) => <UserItem user={item} />}
      keyExtractor={user => String(user.id)}
    />
  );
}
