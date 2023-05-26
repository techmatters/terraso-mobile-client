import {Box, Center, HStack, Text} from 'native-base';
import MaterialIcon from './MaterialIcon';

type Props = {
  name: string;
  label: string;
};

const LabeledIcon = ({name, label}: Props) => {
  return (
    <Box p="2">
      <MaterialIcon name={name} iconProps={{color: 'primary.contrast'}} />
      <Center>
        <Text color="primary.contrast">{label}</Text>
      </Center>
    </Box>
  );
};

export default function BottomNavigation() {
  return (
    <HStack bg="primary.main" justifyContent="center" space={12}>
      <LabeledIcon name="home" label="Home" />
      <LabeledIcon name="sync" label="Sync" />
      <LabeledIcon name="settings" label="Settings" />
    </HStack>
  );
}
