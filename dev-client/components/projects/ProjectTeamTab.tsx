import {VStack} from 'native-base';
import RadioBlock from '../common/RadioBlock';
import AddButton from '../common/AddButton';
import UserList from '../common/UserList';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {TabStackParamList} from './constants';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.TEAM>;

export default function ProjectTeamTab({route}: Props) {
  return (
    <VStack alignItems="flex-start" p={4} space={3}>
      <RadioBlock
        heading="Member Permissions"
        options={[
          {text: 'Can add sites and edit site data', value: 'add-and-edit'},
          {text: 'View only', value: 'view'},
        ]}
        blockName="member-permissions"
        a11yLabel="member permissions"
        defaultValue="add-and-edit"
      />
      <AddButton text="Add Team Members" />
      <UserList users={route.params.users} />
    </VStack>
  );
}
