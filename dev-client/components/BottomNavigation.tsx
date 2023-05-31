import {Box, Center, HStack, Text} from 'native-base';
import MaterialIcon from './MaterialIcon';

type Props = {
  name: string;
  label: string;
};

const LabeledIcon = ({name, label}: Props) => {
  return (
    <Box p="1">
      <MaterialIcon
        name={name}
        iconProps={{color: 'primary.contrast'}}
        iconButtonProps={{pb: 0}}
      />
      <Center>
        <Text color="primary.contrast" fontSize="xs">
          {label}
        </Text>
      </Center>
    </Box>
  );
};

export default function BottomNavigation() {
  return (
    <HStack
      bg="primary.main"
      justifyContent="center"
      space={10}
      pb={2}>
      <LabeledIcon name="home" label="Home" />
      <LabeledIcon name="sync" label="Sync" />
      <LabeledIcon name="settings" label="Settings" />
    </HStack>
  );
}
