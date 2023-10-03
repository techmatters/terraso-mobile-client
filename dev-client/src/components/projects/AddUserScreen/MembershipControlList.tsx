import {FlatList, HStack, Heading, Image, Select, VStack} from 'native-base';
import {User} from 'terraso-client-shared/account/accountSlice';
import {IconButton} from '../../code/terraso-mobile-client/dev-client/src/components/common/Icons';
import {formatNames} from '../../code/terraso-mobile-client/dev-client/src/util';
import {UserRole} from 'terraso-client-shared/graphqlSchema/graphql';

type UserWithRole = {
  user: User;
  role: UserRole;
};

type Props = {
  users: UserWithRole[];
  updateUserRole: (role: UserRole, userId: string) => void;
};

type DisplayProps = {
  user: User;
  role: UserRole;
  roles: [UserRole, string][];
  updateUserRole: (role: UserRole) => void;
};

const UserDisplay = ({
  user: {id, profileImage, firstName, lastName, email},
  roles,
  role,
  updateUserRole,
}: DisplayProps) => {
  return (
    <HStack>
      <Image variant="profilePic" source={{uri: profileImage}} />
      <VStack>
        <Heading>{formatNames(firstName, lastName)}</Heading>
        <Heading>{email}</Heading>
        <Select
          selectedValue={role}
          onValueChange={value => {
            updateUserRole(value as UserRole);
          }}>
          {roles.map(([role, label]) => (
            <Select.Item value={role} label={label} />
          ))}
        </Select>
      </VStack>
      <IconButton name="delete" />
    </HStack>
  );
};

export const MembershipControlList = ({users, updateUserRole}: Props) => {
  return (
    <FlatList
      renderItem={({item: {user, role}}) => (
        <UserDisplay
          user={user}
          role={role}
          roles={[
            ['viewer', 'Viewer'],
            ['contributor', 'Contributor'],
            ['manager', 'Manager'],
          ]}
          updateUserRole={role => updateUserRole(role, user.id)}
        />
      )}
      data={users}
      keyExtractor={({user: {id}}) => id}
    />
  );
};

export default MembershipControlList;
