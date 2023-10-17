import {
  Divider,
  FlatList,
  HStack,
  Image,
  Select,
  Text,
  VStack,
} from 'native-base';
import {User} from 'terraso-client-shared/account/accountSlice';
import {Icon, IconButton} from 'terraso-mobile-client/components/common/Icons';
import {formatName} from 'terraso-mobile-client/util';
import {UserRole} from 'terraso-client-shared/graphqlSchema/graphql';
import {useTranslation} from 'react-i18next';

type UserFields = Omit<User, 'preferences'>;

export type UserWithRole = {user: UserFields; role: UserRole};

type Props = {
  users: UserWithRole[];
  updateUserRole: (role: UserRole, userId: string) => void;
  removeUser: (userId: string) => void;
};

type DisplayProps = {
  user: UserFields;
  role: UserRole;
  roles: [UserRole, string][];
  updateUserRole: (role: UserRole) => void;
  removeUser: () => void;
};

const UserDisplay = ({
  user: {profileImage, firstName, lastName, email},
  roles,
  role,
  updateUserRole,
  removeUser,
}: DisplayProps) => {
  const {t} = useTranslation();
  return (
    <VStack space="5px">
      <HStack mt="15px">
        <Image
          variant="profilePic"
          source={{uri: profileImage}}
          alt={t('general.profile_image_alt')}
        />
        <VStack flexGrow={2} ml="15px">
          <Text fontWeight={700} fontSize="16px">
            {formatName(firstName, lastName)}
          </Text>
          <Text fontWeight={400} fontSize="14px">
            {email}
          </Text>
        </VStack>
        <IconButton name="delete" onPress={removeUser} />
      </HStack>
      <Select
        width="60%"
        ml="50px"
        variant="unstyled"
        dropdownCloseIcon={<Icon name="arrow-drop-down" />}
        dropdownOpenIcon={<Icon name="arrow-drop-down" />}
        selectedValue={role}
        onValueChange={value => {
          updateUserRole(value as UserRole);
        }}>
        {roles.map(([roleName, label]) => (
          <Select.Item value={roleName} label={label} key={roleName} />
        ))}
      </Select>
    </VStack>
  );
};

export const MembershipControlList = ({
  users,
  updateUserRole,
  removeUser,
}: Props) => {
  const itemUpdateUserRole = (userId: string) => (role: UserRole) =>
    updateUserRole(role, userId);
  const itemRemoveUser = (userId: string) => () => removeUser(userId);
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
          updateUserRole={itemUpdateUserRole(user.id)}
          removeUser={itemRemoveUser(user.id)}
        />
      )}
      ListHeaderComponent={Divider}
      ListFooterComponent={Divider}
      ItemSeparatorComponent={Divider}
      data={users}
      keyExtractor={({user: {id}}) => id}
      mx="15px"
      my="15px"
      w="90%"
    />
  );
};

export default MembershipControlList;
